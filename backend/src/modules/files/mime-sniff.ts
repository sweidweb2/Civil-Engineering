/**
 * Magic-byte MIME sniff for trusted upload paths.
 * Returns a canonical MIME or null when unrecognized.
 */
export function sniffMime(buffer: Buffer): string | null {
  if (buffer.length < 4) return null

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }

  // PNG
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png'
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp'
  }

  // PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf'
  }

  // ZIP-based Office (docx/xlsx) — PK
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  ) {
    return 'application/zip'
  }

  // Legacy OLE (doc/xls)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return 'application/x-cfb'
  }

  return null
}

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** Declared client MIME must match sniffed bytes (with jpeg alias + zip/office tolerance). */
export function assertMimeMatchesContent(
  declaredMime: string,
  buffer: Buffer,
  options?: { imagesOnly?: boolean },
): void {
  const declared = declaredMime.toLowerCase().split(';')[0]?.trim() ?? ''
  const sniffed = sniffMime(buffer)

  if (!sniffed) {
    throw new Error('Unrecognized file content')
  }

  if (options?.imagesOnly && !IMAGE_MIMES.has(sniffed)) {
    throw new Error('File content is not an allowed image type')
  }

  if (declared === sniffed) return
  if (declared === 'image/jpg' && sniffed === 'image/jpeg') return

  // Office Open XML is ZIP under the hood.
  if (
    sniffed === 'application/zip' &&
    (declared === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      declared === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  ) {
    return
  }

  if (
    sniffed === 'application/x-cfb' &&
    (declared === 'application/msword' || declared === 'application/vnd.ms-excel')
  ) {
    return
  }

  throw new Error(`Declared MIME ${declared} does not match file content`)
}
