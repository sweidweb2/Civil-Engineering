import type { ListingImportRow } from '@/services/listings'

/** Canonical CSV columns. `name` is required; all others optional. */
export const LISTING_CSV_COLUMNS = [
  'name',
  'category',
  'description',
  'brand',
  'unit',
  'currency',
  'price',
  'price_min',
  'price_max',
  'rental_price',
  'rental_unit',
  'quantity_available',
  'status',
] as const

export type ListingCsvColumn = (typeof LISTING_CSV_COLUMNS)[number]

const COLUMN_SET = new Set<string>(LISTING_CSV_COLUMNS)

const EXAMPLE_ROWS: Array<Record<ListingCsvColumn, string>> = [
  {
    name: 'Portland cement',
    category: 'Cement',
    description: 'Bagged OPC for structural concrete',
    brand: 'BrandX',
    unit: 'bag',
    currency: 'USD',
    price: '7.50',
    price_min: '',
    price_max: '',
    rental_price: '',
    rental_unit: '',
    quantity_available: '100',
    status: 'ACTIVE',
  },
  {
    name: 'Excavator rental',
    category: 'Heavy equipment',
    description: 'Daily excavator hire',
    brand: '',
    unit: '',
    currency: 'USD',
    price: '',
    price_min: '200',
    price_max: '350',
    rental_price: '250',
    rental_unit: 'DAY',
    quantity_available: '2',
    status: 'ACTIVE',
  },
]

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

export function buildListingCsvTemplate(): string {
  // Excel-friendly UTF-8 BOM; header documents required `name` + optional columns.
  const bom = '\uFEFF'
  const header = LISTING_CSV_COLUMNS.join(',')
  const lines = EXAMPLE_ROWS.map((row) =>
    LISTING_CSV_COLUMNS.map((column) => escapeCsvCell(row[column])).join(','),
  )
  return `${bom}${header}\n${lines.join('\n')}\n`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadListingCsvTemplate(filename = 'listings-import-template.csv') {
  triggerDownload(
    new Blob([buildListingCsvTemplate()], { type: 'text/csv;charset=utf-8' }),
    filename,
  )
}

/** Downloads the CSV template plus a rules text file (categories + field constraints). */
export function downloadListingImportBundle(rulesText: string) {
  downloadListingCsvTemplate()
  // Slight delay so the browser registers both downloads.
  window.setTimeout(() => {
    triggerDownload(
      new Blob([`\uFEFF${rulesText}`], { type: 'text/plain;charset=utf-8' }),
      'listings-import-rules.txt',
    )
  }, 250)
}

/** Minimal RFC4180-style CSV parser (quotes, commas, newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === ',') {
      row.push(cell)
      cell = ''
      continue
    }
    if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    if (char === '\r') {
      continue
    }
    cell += char
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((cells) => cells.some((value) => value.trim().length > 0))
}

function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
}

export type ParsedListingCsv = {
  rows: ListingImportRow[]
  ignoredColumns: string[]
  error?: string
}

export function parseListingCsv(text: string): ParsedListingCsv {
  const table = parseCsv(text)
  if (table.length === 0) {
    return { rows: [], ignoredColumns: [], error: 'emptyFile' }
  }

  const headers = table[0]!.map(normalizeHeader)
  if (!headers.includes('name')) {
    return { rows: [], ignoredColumns: [], error: 'missingNameColumn' }
  }

  const ignoredColumns = [...new Set(headers.filter((header) => header && !COLUMN_SET.has(header)))]
  const columnIndex = new Map<ListingCsvColumn, number>()
  headers.forEach((header, index) => {
    if (COLUMN_SET.has(header) && !columnIndex.has(header as ListingCsvColumn)) {
      columnIndex.set(header as ListingCsvColumn, index)
    }
  })

  const rows: ListingImportRow[] = []
  for (const cells of table.slice(1)) {
    const get = (column: ListingCsvColumn) => {
      const index = columnIndex.get(column)
      if (index == null) return ''
      return (cells[index] ?? '').trim()
    }
    const name = get('name')
    const row: ListingImportRow = {
      name,
      category: get('category'),
      description: get('description'),
      brand: get('brand'),
      unit: get('unit'),
      currency: get('currency'),
      price: get('price'),
      price_min: get('price_min'),
      price_max: get('price_max'),
      rental_price: get('rental_price'),
      rental_unit: get('rental_unit'),
      quantity_available: get('quantity_available'),
      status: get('status'),
    }
    const hasAny = Object.values(row).some((value) => value.trim().length > 0)
    if (!hasAny) continue
    rows.push(row)
  }

  if (rows.length === 0) {
    return { rows: [], ignoredColumns, error: 'noDataRows' }
  }

  return { rows, ignoredColumns }
}
