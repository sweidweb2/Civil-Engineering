/**
 * Local/dev seed for the admin portal.
 * Passwords are intentional placeholders for local use only — never use in production.
 *
 * Covers registration approvals, worker verification, providers, platform categories,
 * listings (the directory catalog), projects, reviews, and manager CV profiles.
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
    email: 'worker@example.com',
    role: 'WORKER',
    firstName: 'Worker',
    lastName: 'User',
    phone: '+961 71 300 000',
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
  /** Arabic display name (clients fall back to `name` when null). */
  nameAr: string
  slug: string
  parentSlug?: string
  sortOrder: number
  isActive?: boolean
}

const SEED_CATEGORIES: SeedCategory[] = [
  // —— Materials (parents first) ——
  {
    kind: 'MATERIAL',
    name: 'Cement & concrete',
    nameAr: 'إسمنت وخرسانة',
    slug: 'cement-concrete',
    sortOrder: 1,
  },
  {
    kind: 'MATERIAL',
    name: 'Portland cement',
    nameAr: 'إسمنت بورتلاند',
    slug: 'portland-cement',
    parentSlug: 'cement-concrete',
    sortOrder: 1,
  },
  {
    kind: 'MATERIAL',
    name: 'Ready-mix concrete',
    nameAr: 'خرسانة جاهزة',
    slug: 'ready-mix',
    parentSlug: 'cement-concrete',
    sortOrder: 2,
  },
  {
    kind: 'MATERIAL',
    name: 'Concrete blocks',
    nameAr: 'بلوك خرساني',
    slug: 'concrete-blocks',
    parentSlug: 'cement-concrete',
    sortOrder: 3,
  },
  {
    kind: 'MATERIAL',
    name: 'Precast concrete',
    nameAr: 'خرسانة مسبقة الصب',
    slug: 'precast-concrete',
    parentSlug: 'cement-concrete',
    sortOrder: 4,
  },
  {
    kind: 'MATERIAL',
    name: 'Steel',
    nameAr: 'حديد وصلب',
    slug: 'steel',
    sortOrder: 2,
  },
  {
    kind: 'MATERIAL',
    name: 'Rebar',
    nameAr: 'حديد تسليح',
    slug: 'rebar',
    parentSlug: 'steel',
    sortOrder: 1,
  },
  {
    kind: 'MATERIAL',
    name: 'Structural steel',
    nameAr: 'فولاذ إنشائي',
    slug: 'structural-steel',
    parentSlug: 'steel',
    sortOrder: 2,
  },
  {
    kind: 'MATERIAL',
    name: 'Wire mesh',
    nameAr: 'شبك حديد',
    slug: 'wire-mesh',
    parentSlug: 'steel',
    sortOrder: 3,
  },
  {
    kind: 'MATERIAL',
    name: 'Aggregates',
    nameAr: 'ركام',
    slug: 'aggregates',
    sortOrder: 3,
  },
  {
    kind: 'MATERIAL',
    name: 'Sand',
    nameAr: 'رمل',
    slug: 'sand',
    parentSlug: 'aggregates',
    sortOrder: 1,
  },
  {
    kind: 'MATERIAL',
    name: 'Gravel',
    nameAr: 'حصى',
    slug: 'gravel',
    parentSlug: 'aggregates',
    sortOrder: 2,
  },
  {
    kind: 'MATERIAL',
    name: 'Crushed stone',
    nameAr: 'حجر مكسّر',
    slug: 'crushed-stone',
    parentSlug: 'aggregates',
    sortOrder: 3,
  },
  {
    kind: 'MATERIAL',
    name: 'Masonry & finishing',
    nameAr: 'بناء وتشطيب',
    slug: 'masonry-finishing',
    sortOrder: 4,
  },
  {
    kind: 'MATERIAL',
    name: 'Bricks',
    nameAr: 'طوب',
    slug: 'bricks',
    parentSlug: 'masonry-finishing',
    sortOrder: 1,
  },
  {
    kind: 'MATERIAL',
    name: 'Tiles & flooring',
    nameAr: 'بلاط وأرضيات',
    slug: 'tiles-flooring',
    parentSlug: 'masonry-finishing',
    sortOrder: 2,
  },
  {
    kind: 'MATERIAL',
    name: 'Plaster & gypsum',
    nameAr: 'لياسة وجبس',
    slug: 'plaster-gypsum',
    parentSlug: 'masonry-finishing',
    sortOrder: 3,
  },
  {
    kind: 'MATERIAL',
    name: 'Paints & coatings',
    nameAr: 'دهانات وطلاءات',
    slug: 'paints-coatings',
    parentSlug: 'masonry-finishing',
    sortOrder: 4,
  },
  {
    kind: 'MATERIAL',
    name: 'Waterproofing & insulation',
    nameAr: 'عزل مائي وحراري',
    slug: 'waterproofing-insulation',
    sortOrder: 5,
  },
  {
    kind: 'MATERIAL',
    name: 'Waterproof membranes',
    nameAr: 'أغشية عزل مائي',
    slug: 'waterproof-membranes',
    parentSlug: 'waterproofing-insulation',
    sortOrder: 1,
  },
  {
    kind: 'MATERIAL',
    name: 'Thermal insulation',
    nameAr: 'عزل حراري',
    slug: 'thermal-insulation',
    parentSlug: 'waterproofing-insulation',
    sortOrder: 2,
  },
  {
    kind: 'MATERIAL',
    name: 'Timber & formwork',
    nameAr: 'خشب وشدّات',
    slug: 'timber-formwork',
    sortOrder: 6,
  },
  {
    kind: 'MATERIAL',
    name: 'Formwork timber',
    nameAr: 'خشب شدّات',
    slug: 'formwork-timber',
    parentSlug: 'timber-formwork',
    sortOrder: 1,
  },
  {
    kind: 'MATERIAL',
    name: 'Plywood panels',
    nameAr: 'ألواح خشب رقائقي',
    slug: 'plywood-panels',
    parentSlug: 'timber-formwork',
    sortOrder: 2,
  },
  {
    kind: 'MATERIAL',
    name: 'MEP materials',
    nameAr: 'مواد ميكانيك وكهرباء وسباكة',
    slug: 'mep-materials',
    sortOrder: 7,
  },
  {
    kind: 'MATERIAL',
    name: 'Plumbing pipes & fittings',
    nameAr: 'أنابيب وقطع سباكة',
    slug: 'plumbing-fittings',
    parentSlug: 'mep-materials',
    sortOrder: 1,
  },
  {
    kind: 'MATERIAL',
    name: 'Electrical cables & fixtures',
    nameAr: 'كابلات وتركيبات كهربائية',
    slug: 'electrical-cables',
    parentSlug: 'mep-materials',
    sortOrder: 2,
  },
  {
    kind: 'MATERIAL',
    name: 'HVAC materials',
    nameAr: 'مواد تكييف وتهوية',
    slug: 'hvac-materials',
    parentSlug: 'mep-materials',
    sortOrder: 3,
  },

  // —— Equipment ——
  {
    kind: 'EQUIPMENT',
    name: 'Earthmoving',
    nameAr: 'آليات حفر ونقل تراب',
    slug: 'earthmoving',
    sortOrder: 1,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Excavators',
    nameAr: 'حفّارات',
    slug: 'excavators',
    parentSlug: 'earthmoving',
    sortOrder: 1,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Loaders',
    nameAr: 'لوادر',
    slug: 'loaders',
    parentSlug: 'earthmoving',
    sortOrder: 2,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Bulldozers',
    nameAr: 'جرافات',
    slug: 'bulldozers',
    parentSlug: 'earthmoving',
    sortOrder: 3,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Compactors & rollers',
    nameAr: 'مداحل ورصّاصات',
    slug: 'compactors-rollers',
    parentSlug: 'earthmoving',
    sortOrder: 4,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Lifting',
    nameAr: 'رفع وحمولات',
    slug: 'lifting',
    sortOrder: 2,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Cranes',
    nameAr: 'رافعات',
    slug: 'cranes',
    parentSlug: 'lifting',
    sortOrder: 1,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Telehandlers',
    nameAr: 'رافعات تلسكوبية',
    slug: 'telehandlers',
    parentSlug: 'lifting',
    sortOrder: 2,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Hoists & lifts',
    nameAr: 'مصاعد ومصاعد مواد',
    slug: 'hoists-lifts',
    parentSlug: 'lifting',
    sortOrder: 3,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Concrete equipment',
    nameAr: 'معدات خرسانة',
    slug: 'concrete-equipment',
    sortOrder: 3,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Concrete mixers',
    nameAr: 'خلاطات خرسانة',
    slug: 'concrete-mixers',
    parentSlug: 'concrete-equipment',
    sortOrder: 1,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Concrete vibrators',
    nameAr: 'هزازات خرسانة',
    slug: 'concrete-vibrators',
    parentSlug: 'concrete-equipment',
    sortOrder: 2,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Trailer pumps',
    nameAr: 'مضخات خرسانة مقطورة',
    slug: 'trailer-pumps',
    parentSlug: 'concrete-equipment',
    sortOrder: 3,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Power & generators',
    nameAr: 'طاقة ومولدات',
    slug: 'power-generators',
    sortOrder: 4,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Diesel generators',
    nameAr: 'مولدات ديزل',
    slug: 'diesel-generators',
    parentSlug: 'power-generators',
    sortOrder: 1,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Compressors',
    nameAr: 'ضواغط هواء',
    slug: 'compressors',
    parentSlug: 'power-generators',
    sortOrder: 2,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Scaffolding & access',
    nameAr: 'سقالات ووصول',
    slug: 'scaffolding-access',
    sortOrder: 5,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Scaffold systems',
    nameAr: 'أنظمة سقالات',
    slug: 'scaffold-systems',
    parentSlug: 'scaffolding-access',
    sortOrder: 1,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Formwork systems',
    nameAr: 'أنظمة شدّات',
    slug: 'formwork-systems',
    parentSlug: 'scaffolding-access',
    sortOrder: 2,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Survey & testing gear',
    nameAr: 'أجهزة مساحة واختبار',
    slug: 'survey-testing-gear',
    sortOrder: 6,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Total stations & levels',
    nameAr: 'محطات شاملة ومستويات',
    slug: 'total-stations-levels',
    parentSlug: 'survey-testing-gear',
    sortOrder: 1,
  },
  {
    kind: 'EQUIPMENT',
    name: 'Material testing kits',
    nameAr: 'أطقم اختبار مواد',
    slug: 'material-testing-kits',
    parentSlug: 'survey-testing-gear',
    sortOrder: 2,
  },

  // —— Services ——
  {
    kind: 'SERVICE',
    name: 'Site services',
    nameAr: 'خدمات الموقع',
    slug: 'site-services',
    sortOrder: 1,
  },
  {
    kind: 'SERVICE',
    name: 'Surveying',
    nameAr: 'مساحة',
    slug: 'surveying',
    parentSlug: 'site-services',
    sortOrder: 1,
  },
  {
    kind: 'SERVICE',
    name: 'Concrete pumping',
    nameAr: 'ضخ خرسانة',
    slug: 'concrete-pumping',
    parentSlug: 'site-services',
    sortOrder: 2,
  },
  {
    kind: 'SERVICE',
    name: 'Site preparation',
    nameAr: 'تجهيز الموقع',
    slug: 'site-preparation',
    parentSlug: 'site-services',
    sortOrder: 3,
  },
  {
    kind: 'SERVICE',
    name: 'Demolition',
    nameAr: 'هدم',
    slug: 'demolition',
    parentSlug: 'site-services',
    sortOrder: 4,
  },
  {
    kind: 'SERVICE',
    name: 'Design & engineering',
    nameAr: 'تصميم وهندسة',
    slug: 'design-engineering',
    sortOrder: 2,
  },
  {
    kind: 'SERVICE',
    name: 'Structural design',
    nameAr: 'تصميم إنشائي',
    slug: 'structural-design',
    parentSlug: 'design-engineering',
    sortOrder: 1,
  },
  {
    kind: 'SERVICE',
    name: 'MEP design',
    nameAr: 'تصميم ميكانيك وكهرباء وسباكة',
    slug: 'mep-design',
    parentSlug: 'design-engineering',
    sortOrder: 2,
  },
  {
    kind: 'SERVICE',
    name: 'Shop drawings',
    nameAr: 'مخططات تنفيذية',
    slug: 'shop-drawings',
    parentSlug: 'design-engineering',
    sortOrder: 3,
  },
  {
    kind: 'SERVICE',
    name: 'Testing & QA',
    nameAr: 'اختبار وضمان جودة',
    slug: 'testing-qa',
    sortOrder: 3,
  },
  {
    kind: 'SERVICE',
    name: 'Concrete testing',
    nameAr: 'اختبار خرسانة',
    slug: 'concrete-testing',
    parentSlug: 'testing-qa',
    sortOrder: 1,
  },
  {
    kind: 'SERVICE',
    name: 'Soil investigation',
    nameAr: 'تحقيق تربة',
    slug: 'soil-investigation',
    parentSlug: 'testing-qa',
    sortOrder: 2,
  },
  {
    kind: 'SERVICE',
    name: 'Logistics & transport',
    nameAr: 'لوجستيات ونقل',
    slug: 'logistics-transport',
    sortOrder: 4,
  },
  {
    kind: 'SERVICE',
    name: 'Material delivery',
    nameAr: 'توصيل مواد',
    slug: 'material-delivery',
    parentSlug: 'logistics-transport',
    sortOrder: 1,
  },
  {
    kind: 'SERVICE',
    name: 'Heavy haulage',
    nameAr: 'نقل ثقيل',
    slug: 'heavy-haulage',
    parentSlug: 'logistics-transport',
    sortOrder: 2,
  },
  {
    kind: 'SERVICE',
    name: 'Safety & inspection',
    nameAr: 'سلامة وتفتيش',
    slug: 'safety-inspection',
    sortOrder: 5,
  },
  {
    kind: 'SERVICE',
    name: 'HSE consulting',
    nameAr: 'استشارات سلامة وصحة وبيئة',
    slug: 'hse-consulting',
    parentSlug: 'safety-inspection',
    sortOrder: 1,
  },
  {
    kind: 'SERVICE',
    name: 'Third-party inspection',
    nameAr: 'تفتيش طرف ثالث',
    slug: 'third-party-inspection',
    parentSlug: 'safety-inspection',
    sortOrder: 2,
  },

  // —— Workers ——
  {
    kind: 'WORKER',
    name: 'Trades',
    nameAr: 'حرف ومهن',
    slug: 'trades',
    sortOrder: 1,
  },
  {
    kind: 'WORKER',
    name: 'Masonry',
    nameAr: 'بناء وطوب',
    slug: 'masonry',
    parentSlug: 'trades',
    sortOrder: 1,
  },
  {
    kind: 'WORKER',
    name: 'Steel fixing',
    nameAr: 'حدادة تسليح',
    slug: 'steel-fixing',
    parentSlug: 'trades',
    sortOrder: 2,
  },
  {
    kind: 'WORKER',
    name: 'Equipment operators',
    nameAr: 'مشغّلو آليات',
    slug: 'operators',
    parentSlug: 'trades',
    sortOrder: 3,
  },
  {
    kind: 'WORKER',
    name: 'Carpentry & formwork',
    nameAr: 'نجارة وشدّات',
    slug: 'carpentry-formwork',
    parentSlug: 'trades',
    sortOrder: 4,
  },
  {
    kind: 'WORKER',
    name: 'Electricians',
    nameAr: 'كهربائيون',
    slug: 'electricians',
    parentSlug: 'trades',
    sortOrder: 5,
  },
  {
    kind: 'WORKER',
    name: 'Plumbers',
    nameAr: 'سباكون',
    slug: 'plumbers',
    parentSlug: 'trades',
    sortOrder: 6,
  },
  {
    kind: 'WORKER',
    name: 'Welders',
    nameAr: 'لحّامون',
    slug: 'welders',
    parentSlug: 'trades',
    sortOrder: 7,
  },
  {
    kind: 'WORKER',
    name: 'Painters & finishers',
    nameAr: 'دهّانون وتشطيب',
    slug: 'painters-finishers',
    parentSlug: 'trades',
    sortOrder: 8,
  },
  {
    kind: 'WORKER',
    name: 'Supervision',
    nameAr: 'إشراف',
    slug: 'supervision',
    sortOrder: 2,
  },
  {
    kind: 'WORKER',
    name: 'Site engineers',
    nameAr: 'مهندسو موقع',
    slug: 'site-engineers',
    parentSlug: 'supervision',
    sortOrder: 1,
  },
  {
    kind: 'WORKER',
    name: 'Foremen',
    nameAr: 'مراقبون',
    slug: 'foremen',
    parentSlug: 'supervision',
    sortOrder: 2,
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
    nameAr: seed.nameAr,
    sortOrder: seed.sortOrder,
    isActive: seed.isActive ?? true,
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
