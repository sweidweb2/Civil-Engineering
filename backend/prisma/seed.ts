/**
 * Local/dev seed for the admin portal.
 * Passwords are intentional placeholders for local use only — never use in production.
 *
 * Covers registration approvals, worker verification, providers, platform categories,
 * listings (the directory catalog), projects, reviews, step input types, PM step templates
 * (+ inputs), project steppers for seeded PM projects, and manager CV profiles.
 * The Directory screen still reads sample cards, not these rows.
 */
import 'dotenv/config'

import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'

import {
  type CategoryKind,
  type ListingStatus,
  Prisma,
  PrismaClient,
  type ProjectStatus,
  type ProjectType,
  type ProviderStatus,
  type RentalUnit,
  type ReviewStatus,
  type ReviewTargetType,
  type Role,
  type UserStatus,
  type VerificationStatus,
} from '../src/generated/prisma/client.js'

type ListingType = 'MATERIAL' | 'EQUIPMENT' | 'SERVICE'

const BCRYPT_ROUNDS = 12
const PASSWORD = 'password'

const SEED_INPUT_TYPES: Array<{ code: string; label: string; sortOrder: number }> = [
  { code: 'TEXT', label: 'Text', sortOrder: 10 },
  { code: 'NUMBER', label: 'Number', sortOrder: 20 },
  { code: 'YES_NO', label: 'Yes / No', sortOrder: 30 },
  { code: 'DATE', label: 'Date', sortOrder: 40 },
  { code: 'CATEGORY', label: 'Category listing', sortOrder: 50 },
  { code: 'FILE', label: 'File', sortOrder: 60 },
]

type SeedManagerProfile = {
  ownerEmail: string
  headline: string
  bio: string
  yearsExperience: number
  specialty: string
  education: string
  certifications: string
  skills: string
  languages: string
  city: string
  country: string
  website: string
  linkedinUrl: string
  cvUrl: string
  availability: string
  projectTypes: string
}

const SEED_MANAGER_PROFILES: SeedManagerProfile[] = [
  {
    ownerEmail: 'pm@example.com',
    headline: 'Civil engineer · Project manager',
    bio: 'Independent project manager focused on residential and light commercial builds across Lebanon. Comfortable owning estimates, site coordination, and variance tracking.',
    yearsExperience: 9,
    specialty: 'Structural, residential, fit-out',
    education: 'B.Eng. Civil Engineering — Lebanese University (2015)',
    certifications: 'PMP · Site safety induction · AutoCAD professional',
    skills: 'Estimating, progress tracking, supplier coordination, AutoCAD, Excel cost control',
    languages: 'Arabic, English, French',
    city: 'Beirut',
    country: 'Lebanon',
    website: 'https://example.com/layla-hassan',
    linkedinUrl: 'https://www.linkedin.com/in/example-layla-hassan',
    cvUrl: 'https://example.com/cv/layla-hassan.pdf',
    availability: 'Open to new projects from Q2 2026',
    projectTypes: 'Residential towers, warehouses, villa fit-outs',
  },
]

type SeedStepTemplate = {
  ownerEmail: string
  name: string
  orderNb: number
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  inputs: Array<{
    label: string
    inputTypeCode: string
    orderNb: number
    /** PLATFORM category slug (required when inputTypeCode is CATEGORY). */
    categorySlug?: string
  }>
}

const SEED_STEP_TEMPLATES: SeedStepTemplate[] = [
  {
    ownerEmail: 'pm@example.com',
    name: 'Site survey',
    orderNb: 0,
    status: 'ACTIVE',
    inputs: [
      { label: 'Survey date', inputTypeCode: 'DATE', orderNb: 0 },
      { label: 'Plot reference', inputTypeCode: 'TEXT', orderNb: 1 },
      { label: 'Access restricted', inputTypeCode: 'YES_NO', orderNb: 2 },
    ],
  },
  {
    ownerEmail: 'pm@example.com',
    name: 'Foundation',
    orderNb: 1,
    status: 'ACTIVE',
    inputs: [
      { label: 'Concrete grade', inputTypeCode: 'TEXT', orderNb: 0 },
      { label: 'Pour volume (m³)', inputTypeCode: 'NUMBER', orderNb: 1 },
      { label: 'Pour completed', inputTypeCode: 'YES_NO', orderNb: 2 },
      {
        label: 'Cement product',
        inputTypeCode: 'CATEGORY',
        categorySlug: 'portland-cement',
        orderNb: 3,
      },
    ],
  },
  {
    ownerEmail: 'pm@example.com',
    name: 'Structure',
    orderNb: 2,
    status: 'ACTIVE',
    inputs: [
      { label: 'Current level', inputTypeCode: 'TEXT', orderNb: 0 },
      { label: 'Progress %', inputTypeCode: 'NUMBER', orderNb: 1 },
      {
        label: 'Rebar product',
        inputTypeCode: 'CATEGORY',
        categorySlug: 'rebar',
        orderNb: 2,
      },
    ],
  },
  {
    ownerEmail: 'pm@example.com',
    name: 'Archived handoff notes',
    orderNb: 3,
    status: 'ARCHIVED',
    inputs: [{ label: 'Archive note', inputTypeCode: 'TEXT', orderNb: 0 }],
  },
]

type SeedUser = {
  email: string
  role: Role
  firstName: string
  lastName: string
  phone?: string
  status?: UserStatus
  verificationStatus?: VerificationStatus
}

const SEED_USERS: SeedUser[] = [
  { email: 'super@example.com', role: 'SUPER', firstName: 'Super', lastName: 'User' },
  { email: 'admin@example.com', role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
  {
    email: 'pm@example.com',
    role: 'MANAGER',
    firstName: 'Layla',
    lastName: 'Hassan',
    phone: '+961 03 111 201',
  },
  {
    email: 'pm.pending@example.com',
    role: 'MANAGER',
    firstName: 'Omar',
    lastName: 'Saad',
    status: 'PENDING',
    phone: '+961 03 111 202',
  },
  {
    email: 'client@example.com',
    role: 'CLIENT',
    firstName: 'Nour',
    lastName: 'Fahd',
    phone: '+961 70 200 100',
  },
  {
    email: 'provider@example.com',
    role: 'PROVIDER',
    firstName: 'Rami',
    lastName: 'Khoury',
    phone: '+961 01 555 010',
  },
  {
    email: 'provider2@example.com',
    role: 'PROVIDER',
    firstName: 'Hiba',
    lastName: 'Nassar',
    phone: '+961 06 400 220',
  },
  {
    email: 'pending.provider@example.com',
    role: 'PROVIDER',
    firstName: 'Karim',
    lastName: 'Daoud',
    status: 'PENDING',
    phone: '+961 08 800 330',
  },
  {
    email: 'pending.worker@example.com',
    role: 'WORKER',
    firstName: 'Pending',
    lastName: 'Worker',
    status: 'PENDING',
    verificationStatus: 'UNVERIFIED',
    phone: '+961 71 300 001',
  },
  {
    email: 'worker.unverified@example.com',
    role: 'WORKER',
    firstName: 'Sami',
    lastName: 'Mansour',
    verificationStatus: 'UNVERIFIED',
    phone: '+961 71 300 010',
  },
  {
    email: 'worker.requested@example.com',
    role: 'WORKER',
    firstName: 'Maya',
    lastName: 'Karam',
    verificationStatus: 'REQUESTED',
    phone: '+961 71 300 020',
  },
  {
    email: 'worker.verified@example.com',
    role: 'WORKER',
    firstName: 'Fadi',
    lastName: 'Aoun',
    verificationStatus: 'VERIFIED',
    phone: '+961 71 300 030',
  },
  {
    email: 'worker.pending.request@example.com',
    role: 'WORKER',
    firstName: 'Jad',
    lastName: 'Helou',
    status: 'PENDING',
    verificationStatus: 'REQUESTED',
    phone: '+961 71 300 040',
  },
]

type SeedCategory = {
  kind: CategoryKind
  name: string
  slug: string
  parentSlug?: string
  sortOrder: number
}

const SEED_CATEGORIES: SeedCategory[] = [
  { kind: 'MATERIAL', name: 'Cement & concrete', slug: 'cement-concrete', sortOrder: 1 },
  {
    kind: 'MATERIAL',
    name: 'Portland cement',
    slug: 'portland-cement',
    parentSlug: 'cement-concrete',
    sortOrder: 1,
  },
  {
    kind: 'MATERIAL',
    name: 'Ready-mix concrete',
    slug: 'ready-mix',
    parentSlug: 'cement-concrete',
    sortOrder: 2,
  },
  { kind: 'MATERIAL', name: 'Steel', slug: 'steel', sortOrder: 2 },
  { kind: 'MATERIAL', name: 'Rebar', slug: 'rebar', parentSlug: 'steel', sortOrder: 1 },
  { kind: 'MATERIAL', name: 'Aggregates', slug: 'aggregates', sortOrder: 3 },
  { kind: 'MATERIAL', name: 'Sand', slug: 'sand', parentSlug: 'aggregates', sortOrder: 1 },
  { kind: 'MATERIAL', name: 'Gravel', slug: 'gravel', parentSlug: 'aggregates', sortOrder: 2 },
  { kind: 'EQUIPMENT', name: 'Earthmoving', slug: 'earthmoving', sortOrder: 1 },
  {
    kind: 'EQUIPMENT',
    name: 'Excavators',
    slug: 'excavators',
    parentSlug: 'earthmoving',
    sortOrder: 1,
  },
  { kind: 'EQUIPMENT', name: 'Lifting', slug: 'lifting', sortOrder: 2 },
  { kind: 'EQUIPMENT', name: 'Cranes', slug: 'cranes', parentSlug: 'lifting', sortOrder: 1 },
  { kind: 'SERVICE', name: 'Site services', slug: 'site-services', sortOrder: 1 },
  {
    kind: 'SERVICE',
    name: 'Surveying',
    slug: 'surveying',
    parentSlug: 'site-services',
    sortOrder: 1,
  },
  {
    kind: 'SERVICE',
    name: 'Concrete pumping',
    slug: 'concrete-pumping',
    parentSlug: 'site-services',
    sortOrder: 2,
  },
  { kind: 'WORKER', name: 'Trades', slug: 'trades', sortOrder: 1 },
  { kind: 'WORKER', name: 'Masonry', slug: 'masonry', parentSlug: 'trades', sortOrder: 1 },
  {
    kind: 'WORKER',
    name: 'Steel fixing',
    slug: 'steel-fixing',
    parentSlug: 'trades',
    sortOrder: 2,
  },
  {
    kind: 'WORKER',
    name: 'Equipment operators',
    slug: 'operators',
    parentSlug: 'trades',
    sortOrder: 3,
  },
]

type SeedProvider = {
  ownerEmail: string
  name: string
  description: string
  phone: string
  whatsapp: string
  email: string
  website: string
  address: string
  city: string
  country: string
  lat: number
  lng: number
  status: ProviderStatus
}

const SEED_PROVIDERS: SeedProvider[] = [
  {
    ownerEmail: 'provider@example.com',
    name: 'Khoury Cement & Aggregates',
    description:
      'Bulk cement, ready-mix, and washed aggregates for Beirut and Mount Lebanon sites.',
    phone: '+961 01 555 010',
    whatsapp: '+961 70 555 010',
    email: 'sales@khoury-aggregates.example',
    website: 'https://khoury-aggregates.example',
    address: 'Dora highway, warehouse 4',
    city: 'Beirut',
    country: 'Lebanon',
    lat: 33.8938,
    lng: 35.5018,
    status: 'APPROVED',
  },
  {
    ownerEmail: 'provider2@example.com',
    name: 'Nassar Plant & Equipment',
    description: 'Excavators, cranes, and pumping crews for hire. Delivery across the north.',
    phone: '+961 06 400 220',
    whatsapp: '+961 70 400 220',
    email: 'desk@nassar-plant.example',
    website: 'https://nassar-plant.example',
    address: 'Port road, yard B',
    city: 'Tripoli',
    country: 'Lebanon',
    lat: 34.4367,
    lng: 35.8497,
    status: 'APPROVED',
  },
  {
    ownerEmail: 'pending.provider@example.com',
    name: 'Daoud Building Supplies',
    description: 'New supplier waiting for admin approval. Not visible in the marketplace yet.',
    phone: '+961 08 800 330',
    whatsapp: '+961 71 800 330',
    email: 'hello@daoud-supplies.example',
    website: 'https://daoud-supplies.example',
    address: 'Industrial zone, unit 12',
    city: 'Zahle',
    country: 'Lebanon',
    lat: 33.8463,
    lng: 35.902,
    status: 'PENDING',
  },
]

type SeedListing = {
  providerEmail: string
  categorySlug: string
  type: ListingType
  name: string
  description: string
  brand?: string
  unit: string
  currency: string
  price: string
  rentalPrice?: string
  rentalUnit?: RentalUnit
  quantityAvailable?: string
  status?: ListingStatus
}

const SEED_LISTINGS: SeedListing[] = [
  {
    providerEmail: 'provider@example.com',
    categorySlug: 'portland-cement',
    type: 'MATERIAL',
    name: 'Portland cement 42.5',
    description: 'Bagged and bulk OPC for structural concrete. Delivered to site in Beirut.',
    brand: 'Holcim',
    unit: 'ton',
    currency: 'USD',
    price: '128.0000',
    quantityAvailable: '500.0000',
  },
  {
    providerEmail: 'provider@example.com',
    categorySlug: 'ready-mix',
    type: 'MATERIAL',
    name: 'Ready-mix C30',
    description: '30 MPa ready-mix with pump coordination on request.',
    brand: 'Khoury',
    unit: 'm3',
    currency: 'USD',
    price: '95.0000',
    quantityAvailable: '80.0000',
  },
  {
    providerEmail: 'provider@example.com',
    categorySlug: 'rebar',
    type: 'MATERIAL',
    name: 'Rebar 12 mm',
    description: 'Deformed steel bars, 12 m lengths, mill certificates available.',
    brand: 'AUB Steel',
    unit: 'ton',
    currency: 'USD',
    price: '780.0000',
    quantityAvailable: '40.0000',
  },
  {
    providerEmail: 'provider@example.com',
    categorySlug: 'sand',
    type: 'MATERIAL',
    name: 'Washed sand',
    description: 'Concrete sand, screened and washed. Currently hidden from the directory.',
    brand: 'Khoury',
    unit: 'm3',
    currency: 'USD',
    price: '28.0000',
    quantityAvailable: '200.0000',
    status: 'INACTIVE',
  },
  {
    providerEmail: 'provider2@example.com',
    categorySlug: 'excavators',
    type: 'EQUIPMENT',
    name: 'Excavator 20 t',
    description: 'Tracked excavator with operator optional. Fuel not included.',
    brand: 'Caterpillar',
    unit: 'day',
    currency: 'USD',
    price: '350.0000',
    rentalPrice: '350.0000',
    rentalUnit: 'DAY',
    quantityAvailable: '3.0000',
  },
  {
    providerEmail: 'provider2@example.com',
    categorySlug: 'cranes',
    type: 'EQUIPMENT',
    name: 'Mobile crane 50 t',
    description: 'All-terrain crane with certified operator. Book two days ahead.',
    brand: 'Liebherr',
    unit: 'day',
    currency: 'USD',
    price: '900.0000',
    rentalPrice: '900.0000',
    rentalUnit: 'DAY',
    quantityAvailable: '1.0000',
  },
  {
    providerEmail: 'provider2@example.com',
    categorySlug: 'concrete-pumping',
    type: 'SERVICE',
    name: 'Boom pump crew',
    description: '32 m boom pump and two operators. Minimum four hours.',
    unit: 'hour',
    currency: 'USD',
    price: '180.0000',
    rentalPrice: '180.0000',
    rentalUnit: 'HOUR',
  },
  {
    providerEmail: 'provider2@example.com',
    categorySlug: 'surveying',
    type: 'SERVICE',
    name: 'Site survey',
    description: 'Topographic survey and setting-out for small and mid-size plots.',
    unit: 'day',
    currency: 'USD',
    price: '250.0000',
  },
]

type SeedProject = {
  code: string
  name: string
  description: string
  ownerEmail: string
  address: string
  city: string
  country: string
  status: ProjectStatus
  type: ProjectType
  progress: number
  budget: string
  currency: string
  actualCost?: string
  startDate: Date
  endDate: Date
  notes: string
}

const SEED_PROJECTS: SeedProject[] = [
  {
    code: 'BRT-2026-01',
    name: 'Beirut Marina Residences',
    description: 'Eight-storey residential block with two basement parking levels.',
    ownerEmail: 'pm@example.com',
    address: 'Marina walk, plot 14',
    city: 'Beirut',
    country: 'Lebanon',
    status: 'IN_PROGRESS',
    type: 'RESIDENTIAL',
    progress: 42,
    budget: '2500000.0000',
    currency: 'USD',
    actualCost: '980000.0000',
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2027-06-30T00:00:00.000Z'),
    notes: 'Structure on level 3. Cement deliveries weekly.',
  },
  {
    code: 'TRP-2026-04',
    name: 'Tripoli Cold Storage',
    description: 'Single-storey warehouse with insulated panels and loading docks.',
    ownerEmail: 'pm@example.com',
    address: 'Port road, parcel 8',
    city: 'Tripoli',
    country: 'Lebanon',
    status: 'PLANNING',
    type: 'COMMERCIAL',
    progress: 10,
    budget: '1800000.0000',
    currency: 'USD',
    startDate: new Date('2026-11-01T00:00:00.000Z'),
    endDate: new Date('2027-09-01T00:00:00.000Z'),
    notes: 'Waiting on crane availability from Nassar.',
  },
  {
    code: 'SID-2026-02',
    name: 'Saida Coastal Road',
    description: 'Bridge approach and drainage along the coastal highway.',
    ownerEmail: 'pm@example.com',
    address: 'Coastal highway km 42',
    city: 'Sidon',
    country: 'Lebanon',
    status: 'APPROVED',
    type: 'INFRASTRUCTURE',
    progress: 5,
    budget: '6400000.0000',
    currency: 'USD',
    startDate: new Date('2026-08-15T00:00:00.000Z'),
    endDate: new Date('2028-02-28T00:00:00.000Z'),
    notes: 'Rebar schedule not issued yet.',
  },
  {
    code: 'HAM-2025-11',
    name: 'Hamra Clinic Renovation',
    description: 'Interior refit of a three-floor clinic, including wet areas.',
    ownerEmail: 'pm@example.com',
    address: 'Hamra street, building 22',
    city: 'Beirut',
    country: 'Lebanon',
    status: 'COMPLETED',
    type: 'RENOVATION',
    progress: 100,
    budget: '420000.0000',
    currency: 'USD',
    actualCost: '405000.0000',
    startDate: new Date('2025-06-01T00:00:00.000Z'),
    endDate: new Date('2026-01-20T00:00:00.000Z'),
    notes: 'Handed over. Retention still open.',
  },
  {
    code: 'JOU-2026-06',
    name: 'Jounieh Villa',
    description: 'Draft brief for a hillside villa. Scope not locked.',
    ownerEmail: 'pm@example.com',
    address: 'Kesrwan slope, lot 3',
    city: 'Jounieh',
    country: 'Lebanon',
    status: 'DRAFT',
    type: 'RESIDENTIAL',
    progress: 0,
    budget: '900000.0000',
    currency: 'USD',
    startDate: new Date('2026-12-01T00:00:00.000Z'),
    endDate: new Date('2027-12-01T00:00:00.000Z'),
    notes: 'Client has not approved the brief.',
  },
]

type SeedReview = {
  authorEmail: string
  targetType: ReviewTargetType
  targetKey: string
  rating: number
  comment: string
  status: ReviewStatus
}

const SEED_REVIEWS: SeedReview[] = [
  {
    authorEmail: 'client@example.com',
    targetType: 'PROVIDER',
    targetKey: 'provider@example.com',
    rating: 5,
    comment: 'Cement arrived on time and the batch tickets matched the order.',
    status: 'ACCEPTED',
  },
  {
    authorEmail: 'pm@example.com',
    targetType: 'PROVIDER',
    targetKey: 'provider2@example.com',
    rating: 4,
    comment: 'Excavator was clean and the operator knew the site constraints.',
    status: 'PENDING',
  },
  {
    authorEmail: 'client@example.com',
    targetType: 'LISTING',
    targetKey: 'Portland cement 42.5',
    rating: 5,
    comment: 'Strength tests on the 42.5 bags were consistent across three deliveries.',
    status: 'ACCEPTED',
  },
  {
    authorEmail: 'pm@example.com',
    targetType: 'WORKER',
    targetKey: 'worker.verified@example.com',
    rating: 4,
    comment: 'Fadi set out the grid accurately and kept the crew moving.',
    status: 'ACCEPTED',
  },
  {
    authorEmail: 'admin@example.com',
    targetType: 'LISTING',
    targetKey: 'Mobile crane 50 t',
    rating: 2,
    comment: 'Listed day rate did not match the quote sent to the site.',
    status: 'REJECTED',
  },
]

async function upsertUser(prisma: PrismaClient, seed: SeedUser) {
  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS)
  const displayName = `${seed.firstName} ${seed.lastName}`
  const status = seed.status ?? 'ACTIVE'
  const verificationStatus = seed.verificationStatus ?? 'UNVERIFIED'
  const profile = {
    firstName: seed.firstName,
    lastName: seed.lastName,
    displayName,
    phone: seed.phone ?? null,
  }

  return prisma.user.upsert({
    where: { email: seed.email },
    create: {
      email: seed.email,
      passwordHash,
      role: seed.role,
      status,
      verificationStatus,
      isVerified: verificationStatus === 'VERIFIED',
      profile: { create: profile },
    },
    update: {
      passwordHash,
      role: seed.role,
      status,
      verificationStatus,
      isVerified: verificationStatus === 'VERIFIED',
      profile: {
        upsert: {
          create: profile,
          update: profile,
        },
      },
    },
  })
}

async function upsertCategory(prisma: PrismaClient, seed: SeedCategory, parentId: string | null) {
  const existing = await prisma.category.findFirst({
    where: {
      scope: 'PLATFORM',
      kind: seed.kind,
      slug: seed.slug,
      parentId,
    },
  })
  const data = {
    name: seed.name,
    sortOrder: seed.sortOrder,
    isActive: true,
  }
  if (existing) {
    return prisma.category.update({ where: { id: existing.id }, data })
  }
  return prisma.category.create({
    data: {
      ...data,
      scope: 'PLATFORM',
      kind: seed.kind,
      slug: seed.slug,
      parentId,
    },
  })
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed')
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

  try {
    for (const seed of SEED_INPUT_TYPES) {
      const inputType = await prisma.inputType.upsert({
        where: { code: seed.code },
        create: {
          code: seed.code,
          label: seed.label,
          sortOrder: seed.sortOrder,
          status: 'ACTIVE',
        },
        update: {
          label: seed.label,
          sortOrder: seed.sortOrder,
        },
      })
      console.info(`[prisma seed] input type ${inputType.code} ${inputType.status}`)
    }

    const users = new Map<string, { id: string }>()
    for (const seed of SEED_USERS) {
      const user = await upsertUser(prisma, seed)
      users.set(seed.email, user)
      console.info(`[prisma seed] user ${user.role} ${user.email} ${user.status}`)
    }

    for (const seed of SEED_MANAGER_PROFILES) {
      const owner = users.get(seed.ownerEmail)
      if (!owner) throw new Error(`Missing manager profile owner ${seed.ownerEmail}`)
      const data = {
        headline: seed.headline,
        bio: seed.bio,
        yearsExperience: seed.yearsExperience,
        specialty: seed.specialty,
        education: seed.education,
        certifications: seed.certifications,
        skills: seed.skills,
        languages: seed.languages,
        city: seed.city,
        country: seed.country,
        website: seed.website,
        linkedinUrl: seed.linkedinUrl,
        cvUrl: seed.cvUrl,
        availability: seed.availability,
        projectTypes: seed.projectTypes,
      }
      const profile = await prisma.managerProfile.upsert({
        where: { userId: owner.id },
        create: { ...data, userId: owner.id },
        update: data,
      })
      console.info(`[prisma seed] manager profile ${seed.ownerEmail} ${profile.id}`)
    }

    const inputTypes = new Map<string, { id: string; code: string; label: string }>()
    for (const seed of SEED_INPUT_TYPES) {
      const row = await prisma.inputType.findUnique({ where: { code: seed.code } })
      if (row) inputTypes.set(seed.code, row)
    }

    const providers = new Map<string, { id: string }>()
    for (const seed of SEED_PROVIDERS) {
      const owner = users.get(seed.ownerEmail)
      if (!owner) throw new Error(`Missing owner ${seed.ownerEmail}`)
      const data = {
        name: seed.name,
        description: seed.description,
        phone: seed.phone,
        whatsapp: seed.whatsapp,
        email: seed.email,
        website: seed.website,
        address: seed.address,
        city: seed.city,
        country: seed.country,
        lat: seed.lat,
        lng: seed.lng,
        status: seed.status,
      }
      const provider = await prisma.provider.upsert({
        where: { ownerUserId: owner.id },
        create: { ...data, ownerUserId: owner.id },
        update: data,
      })
      providers.set(seed.ownerEmail, provider)
      console.info(`[prisma seed] provider ${provider.status} ${provider.name}`)
    }

    const categories = new Map<string, { id: string }>()
    for (const seed of SEED_CATEGORIES) {
      const parent = seed.parentSlug ? categories.get(`${seed.kind}:${seed.parentSlug}`) : undefined
      if (seed.parentSlug && !parent) throw new Error(`Missing parent ${seed.parentSlug}`)
      const category = await upsertCategory(prisma, seed, parent?.id ?? null)
      categories.set(`${seed.kind}:${seed.slug}`, category)
      console.info(`[prisma seed] category ${seed.kind} ${seed.name}`)
    }

    function categoryIdBySlug(slug: string): string {
      for (const [key, category] of categories) {
        if (key.endsWith(`:${slug}`)) return category.id
      }
      throw new Error(`Missing category slug ${slug}`)
    }

    // Step templates after categories so CATEGORY inputs can bind categoryId.
    for (const seed of SEED_STEP_TEMPLATES) {
      const owner = users.get(seed.ownerEmail)
      if (!owner) throw new Error(`Missing step owner ${seed.ownerEmail}`)
      const existing = await prisma.step.findFirst({
        where: { userId: owner.id, name: seed.name },
      })
      const step = existing
        ? await prisma.step.update({
            where: { id: existing.id },
            data: { orderNb: seed.orderNb, status: seed.status },
          })
        : await prisma.step.create({
            data: {
              userId: owner.id,
              name: seed.name,
              orderNb: seed.orderNb,
              status: seed.status,
            },
          })

      for (const input of seed.inputs) {
        const inputType = inputTypes.get(input.inputTypeCode)
        if (!inputType) throw new Error(`Missing input type ${input.inputTypeCode}`)
        const categoryId =
          input.inputTypeCode === 'CATEGORY' ? categoryIdBySlug(input.categorySlug ?? '') : null
        if (input.inputTypeCode === 'CATEGORY' && !input.categorySlug) {
          throw new Error(`CATEGORY input "${input.label}" requires categorySlug`)
        }
        const existingInput = await prisma.stepInput.findFirst({
          where: { stepId: step.id, label: input.label },
        })
        if (existingInput) {
          await prisma.stepInput.update({
            where: { id: existingInput.id },
            data: {
              inputTypeId: inputType.id,
              orderNb: input.orderNb,
              categoryId,
            },
          })
        } else {
          await prisma.stepInput.create({
            data: {
              stepId: step.id,
              inputTypeId: inputType.id,
              label: input.label,
              orderNb: input.orderNb,
              categoryId,
            },
          })
        }
      }
      console.info(
        `[prisma seed] step ${seed.status} ${seed.name} (${seed.inputs.length} input(s)) for ${seed.ownerEmail}`,
      )
    }

    const listings = new Map<string, { id: string }>()
    for (const seed of SEED_LISTINGS) {
      const provider = providers.get(seed.providerEmail)
      const category = categories.get(`${seed.type}:${seed.categorySlug}`)
      if (!provider) throw new Error(`Missing provider ${seed.providerEmail}`)
      if (!category) throw new Error(`Missing category ${seed.categorySlug}`)
      const data: Prisma.ListingUncheckedCreateInput = {
        providerId: provider.id,
        categoryId: category.id,
        name: seed.name,
        description: seed.description,
        brand: seed.brand ?? null,
        unit: seed.unit,
        currency: seed.currency,
        price: seed.price,
        priceMin: null,
        priceMax: null,
        rentalPrice: seed.rentalPrice ?? null,
        rentalUnit: seed.rentalUnit ?? null,
        quantityAvailable: seed.quantityAvailable ?? null,
        status: seed.status ?? 'ACTIVE',
      }
      const existing = await prisma.listing.findFirst({
        where: { providerId: provider.id, name: seed.name },
      })
      const listing = existing
        ? await prisma.listing.update({ where: { id: existing.id }, data })
        : await prisma.listing.create({ data })
      listings.set(seed.name, listing)
      console.info(`[prisma seed] listing ${listing.status} ${listing.name}`)
    }

    for (const seed of SEED_PROJECTS) {
      const owner = users.get(seed.ownerEmail)
      if (!owner) throw new Error(`Missing project owner ${seed.ownerEmail}`)
      const data = {
        name: seed.name,
        description: seed.description,
        ownerId: owner.id,
        address: seed.address,
        city: seed.city,
        country: seed.country,
        status: seed.status,
        type: seed.type,
        progress: seed.progress,
        budget: seed.budget,
        currency: seed.currency,
        actualCost: seed.actualCost ?? null,
        startDate: seed.startDate,
        endDate: seed.endDate,
        notes: seed.notes,
      }
      const project = await prisma.project.upsert({
        where: { code: seed.code },
        create: { ...data, code: seed.code },
        update: data,
      })
      console.info(`[prisma seed] project ${project.status} ${project.code}`)

      const templates = await prisma.step.findMany({
        where: { userId: owner.id, status: 'ACTIVE' },
        orderBy: [{ orderNb: 'asc' }, { name: 'asc' }],
        include: {
          inputs: {
            orderBy: [{ orderNb: 'asc' }, { label: 'asc' }],
            include: { inputType: { select: { code: true, label: true } } },
          },
        },
      })
      const existingSteppers = await prisma.stepperProject.count({
        where: { projectId: project.id },
      })
      if (templates.length > 0 && existingSteppers !== templates.length) {
        await prisma.stepperProject.deleteMany({ where: { projectId: project.id } })
        for (const template of templates) {
          const link = await prisma.stepperProject.create({
            data: {
              projectId: project.id,
              name: template.name,
              orderNb: template.orderNb,
            },
          })
          if (template.inputs.length === 0) continue
          await prisma.projectStepInput.createMany({
            data: template.inputs.map((input) => ({
              stepperProjectId: link.id,
              inputTypeId: input.inputTypeId,
              inputTypeCode: input.inputType.code,
              inputTypeLabel: input.inputType.label,
              label: input.label,
              orderNb: input.orderNb,
              categoryId: input.categoryId,
              value: Prisma.DbNull,
              isProjectOnly: false,
            })),
          })
        }
        console.info(
          `[prisma seed] project steppers ${project.code} ← ${templates.length} active template(s)`,
        )
      }
    }

    for (const seed of SEED_REVIEWS) {
      const author = users.get(seed.authorEmail)
      if (!author) throw new Error(`Missing review author ${seed.authorEmail}`)
      const target =
        seed.targetType === 'PROVIDER'
          ? providers.get(seed.targetKey)
          : seed.targetType === 'WORKER'
            ? users.get(seed.targetKey)
            : listings.get(seed.targetKey)
      if (!target) throw new Error(`Missing review target ${seed.targetKey}`)
      const review = await prisma.review.upsert({
        where: {
          authorId_targetType_targetId: {
            authorId: author.id,
            targetType: seed.targetType,
            targetId: target.id,
          },
        },
        create: {
          authorId: author.id,
          targetType: seed.targetType,
          targetId: target.id,
          rating: seed.rating,
          comment: seed.comment,
          status: seed.status,
        },
        update: {
          rating: seed.rating,
          comment: seed.comment,
          status: seed.status,
        },
      })
      console.info(`[prisma seed] review ${review.status} ${seed.targetType} ${seed.targetKey}`)
    }

    console.info('[prisma seed] done. Sign in with admin@example.com / password')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
