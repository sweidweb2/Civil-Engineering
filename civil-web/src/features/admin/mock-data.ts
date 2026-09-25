import type { AuthRole } from '@/services/auth'

import type {
  AdminProject,
  AdminUserRow,
  AnalyticsSnapshot,
  DirectoryItem,
  LoginDayPoint,
  PlatformCategory,
  PlatformReview,
  ProviderShop,
  RegistrationRow,
  WorkerVerificationRow,
} from './admin.types'

function isoDaysAgo(days: number, hour = 10): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function row(
  id: string,
  email: string,
  role: AuthRole,
  status: AdminUserRow['status'],
  createdDays: number,
  profile: AdminUserRow['profile'],
): AdminUserRow {
  const createdAt = isoDaysAgo(createdDays)
  return {
    id,
    email,
    role,
    status,
    isVerified: false,
    createdAt,
    updatedAt: createdAt,
    profile: {
      ...profile,
      createdAt,
      updatedAt: createdAt,
    },
  }
}

export const MOCK_USERS: AdminUserRow[] = [
  row('usr_01', 'super@example.com', 'SUPER', 'ACTIVE', 40, {
    firstName: 'Platform',
    lastName: 'Owner',
    displayName: 'Super',
    phone: '+961 70 000 001',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_02', 'admin@example.com', 'ADMIN', 'ACTIVE', 38, {
    firstName: 'Nour',
    lastName: 'Haddad',
    displayName: 'Nour H.',
    phone: '+961 70 000 002',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_03', 'pm.karim@example.com', 'MANAGER', 'ACTIVE', 20, {
    firstName: 'Karim',
    lastName: 'Mansour',
    displayName: 'Karim M.',
    phone: '+961 71 111 222',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_04', 'pm.lina@example.com', 'MANAGER', 'INACTIVE', 18, {
    firstName: 'Lina',
    lastName: 'Chamoun',
    displayName: 'Lina C.',
    phone: '+961 71 333 444',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_05', 'steel.works@example.com', 'PROVIDER', 'ACTIVE', 16, {
    firstName: 'Rami',
    lastName: 'Khoury',
    displayName: 'Steel Works Co.',
    phone: '+961 01 555 010',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_06', 'cement.plus@example.com', 'PROVIDER', 'ACTIVE', 14, {
    firstName: null,
    lastName: null,
    displayName: 'Cement Plus',
    phone: '+961 01 555 020',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_07', 'worker.ali@example.com', 'WORKER', 'ACTIVE', 12, {
    firstName: 'Ali',
    lastName: 'Farhat',
    displayName: 'Ali Farhat',
    phone: '+961 76 200 301',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_08', 'worker.maya@example.com', 'WORKER', 'INACTIVE', 11, {
    firstName: 'Maya',
    lastName: 'Saab',
    displayName: 'Maya Saab',
    phone: '+961 76 200 302',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_09', 'guest.home@example.com', 'CLIENT', 'ACTIVE', 9, {
    firstName: 'Sami',
    lastName: 'Aoun',
    displayName: 'Sami',
    phone: null,
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_10', 'pm.jad@example.com', 'MANAGER', 'ACTIVE', 8, {
    firstName: 'Jad',
    lastName: 'Rahme',
    displayName: 'Jad Rahme Project Office with a very long display name',
    phone: '+961 70 888 999',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_11', 'glass.north@example.com', 'PROVIDER', 'INACTIVE', 7, {
    firstName: 'Hiba',
    lastName: 'Nassar',
    displayName: 'North Glass Supplies',
    phone: '+961 06 440 110',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_12', 'mason.walid@example.com', 'WORKER', 'ACTIVE', 6, {
    firstName: 'Walid',
    lastName: 'Tannous',
    displayName: 'Walid T.',
    phone: '+961 81 100 200',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_13', 'client.roof@example.com', 'CLIENT', 'ACTIVE', 5, {
    firstName: 'Rita',
    lastName: 'Abi',
    displayName: 'Rita Abi',
    phone: '+961 03 111 000',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_14', 'pm.sara@example.com', 'MANAGER', 'ACTIVE', 4, {
    firstName: 'Sara',
    lastName: 'Karam',
    displayName: 'Sara Karam',
    phone: '+961 70 404 505',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_15', 'equip.rent@example.com', 'PROVIDER', 'ACTIVE', 3, {
    firstName: 'Fadi',
    lastName: 'Younes',
    displayName: 'EquipRent',
    phone: '+961 01 770 880',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_16', 'welder.nabil@example.com', 'WORKER', 'ACTIVE', 2, {
    firstName: 'Nabil',
    lastName: 'Hajj',
    displayName: 'Nabil Hajj',
    phone: '+961 76 909 808',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_17', 'client.garden@example.com', 'CLIENT', 'INACTIVE', 2, {
    firstName: 'Elie',
    lastName: 'Boutros',
    displayName: null,
    phone: null,
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
  row('usr_18', 'pm.omar@example.com', 'MANAGER', 'ACTIVE', 1, {
    firstName: 'Omar',
    lastName: 'Sleiman',
    displayName: 'Omar Sleiman',
    phone: '+961 71 600 700',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  }),
]

const extraPendingProvider = row('usr_19', 'crane.east@example.com', 'PROVIDER', 'ACTIVE', 1, {
  firstName: 'Tarek',
  lastName: 'Saliba',
  displayName: 'East Crane & Heavy Equipment Trading Company',
  phone: '+961 01 990 001',
  avatarUrl: null,
  createdAt: '',
  updatedAt: '',
})

const extraPendingWorker = row('usr_20', 'painter.zeina@example.com', 'WORKER', 'ACTIVE', 0, {
  firstName: 'Zeina',
  lastName: 'Mrad',
  displayName: 'Zeina Mrad',
  phone: '+961 76 333 111',
  avatarUrl: null,
  createdAt: '',
  updatedAt: '',
})

/** Approval is UI-only — Prisma has ACTIVE/INACTIVE, not a pending column. */
export const MOCK_REGISTRATIONS: RegistrationRow[] = [
  { ...MOCK_USERS[2], approval: 'approved' },
  { ...MOCK_USERS[3], approval: 'approved' },
  { ...MOCK_USERS[4], approval: 'approved' },
  { ...MOCK_USERS[5], approval: 'approved' },
  { ...MOCK_USERS[6], approval: 'approved' },
  { ...MOCK_USERS[9], approval: 'pending' },
  { ...MOCK_USERS[10], approval: 'pending' },
  { ...MOCK_USERS[11], approval: 'pending' },
  { ...MOCK_USERS[13], approval: 'pending' },
  { ...MOCK_USERS[14], approval: 'approved' },
  { ...MOCK_USERS[15], approval: 'pending' },
  { ...MOCK_USERS[17], approval: 'pending' },
  { ...extraPendingProvider, approval: 'pending' },
  { ...extraPendingWorker, approval: 'pending' },
]

export const MOCK_ANALYTICS: AnalyticsSnapshot = {
  registeredUsers: MOCK_USERS.length,
  activePms: MOCK_USERS.filter((u) => u.role === 'MANAGER' && u.status === 'ACTIVE').length,
  providers: MOCK_USERS.filter((u) => u.role === 'PROVIDER').length,
  workers: MOCK_USERS.filter((u) => u.role === 'WORKER').length,
  projects: 24,
  marketplaceListings: 86,
  listingViews: 4120,
  directoryViews: 1988,
  reports: 7,
  verificationRequests: 5,
}

export const MOCK_LOGINS_DAILY: LoginDayPoint[] = [
  { date: isoDaysAgo(13), count: 6 },
  { date: isoDaysAgo(12), count: 9 },
  { date: isoDaysAgo(11), count: 8 },
  { date: isoDaysAgo(10), count: 12 },
  { date: isoDaysAgo(9), count: 7 },
  { date: isoDaysAgo(8), count: 14 },
  { date: isoDaysAgo(7), count: 11 },
  { date: isoDaysAgo(6), count: 16 },
  { date: isoDaysAgo(5), count: 13 },
  { date: isoDaysAgo(4), count: 18 },
  { date: isoDaysAgo(3), count: 15 },
  { date: isoDaysAgo(2), count: 19 },
  { date: isoDaysAgo(1), count: 17 },
  { date: isoDaysAgo(0), count: 21 },
]

const WORKER_VERIFICATION: Record<string, WorkerVerificationRow['verification']> = {
  usr_07: 'verified',
  usr_08: 'requested',
  usr_12: 'requested',
  usr_16: 'unverified',
}

export const MOCK_WORKER_VERIFICATIONS: WorkerVerificationRow[] = MOCK_USERS.filter(
  (user) => user.role === 'WORKER',
).map((user) => {
  const verification = WORKER_VERIFICATION[user.id] ?? 'unverified'
  return {
    ...user,
    isVerified: verification === 'verified',
    verification,
  }
})

const PROVIDER_SHOPS: Record<string, Pick<ProviderShop, 'location' | 'category' | 'listingCount'>> =
  {
    usr_05: { location: 'Beirut', category: 'Steel', listingCount: 18 },
    usr_06: { location: 'Tripoli', category: 'Cement', listingCount: 12 },
    usr_11: { location: 'Jounieh', category: 'Glass', listingCount: 9 },
    usr_15: { location: 'Zahle', category: 'Equipment', listingCount: 22 },
  }

export const MOCK_PROVIDER_SHOPS: ProviderShop[] = MOCK_USERS.filter(
  (user) => user.role === 'PROVIDER',
).map((user) => ({
  id: user.id,
  userId: user.id,
  name: user.profile.displayName || user.email,
  location: PROVIDER_SHOPS[user.id]?.location ?? 'Lebanon',
  category: PROVIDER_SHOPS[user.id]?.category ?? 'General',
  listingCount: PROVIDER_SHOPS[user.id]?.listingCount ?? 4,
  status: user.status,
}))

export const MOCK_CATEGORIES: PlatformCategory[] = [
  { id: 'cat_01', name: 'Cement', kind: 'material' },
  { id: 'cat_02', name: 'Steel', kind: 'material' },
  { id: 'cat_03', name: 'Wood', kind: 'material' },
  { id: 'cat_04', name: 'Glass', kind: 'material' },
  { id: 'cat_05', name: 'Roofing', kind: 'material' },
  { id: 'cat_06', name: 'Equipment', kind: 'material' },
  { id: 'cat_07', name: 'Carpentry', kind: 'worker' },
  { id: 'cat_08', name: 'Masonry', kind: 'worker' },
  { id: 'cat_09', name: 'Welding', kind: 'worker' },
  { id: 'cat_10', name: 'Plumbing', kind: 'worker' },
  { id: 'cat_11', name: 'Electrical', kind: 'worker' },
]

export const MOCK_PROJECTS: AdminProject[] = [
  { id: 'prj_01', name: 'Beirut Waterfront Tower', location: 'Beirut', managerName: 'Karim Mansour', status: 'active' },
  { id: 'prj_02', name: 'Tripoli Ring Road', location: 'Tripoli', managerName: 'Lina Chamoun', status: 'planning' },
  { id: 'prj_03', name: 'Zahle Clinic Wing', location: 'Zahle', managerName: 'Karim Mansour', status: 'active' },
  { id: 'prj_04', name: 'Jounieh Marina Store', location: 'Jounieh', managerName: 'Lina Chamoun', status: 'completed' },
  { id: 'prj_05', name: 'Saida School Block', location: 'Saida', managerName: 'Karim Mansour', status: 'planning' },
  { id: 'prj_06', name: 'Byblos Heritage Facade', location: 'Byblos', managerName: 'Lina Chamoun', status: 'active' },
]

export const MOCK_DIRECTORY: DirectoryItem[] = [
  { id: 'dir_01', name: 'Portland cement 50kg', kind: 'material', category: 'Cement', location: 'Beirut', source: 'Cedar Supplies', price: 'USD 7.40' },
  { id: 'dir_02', name: 'Rebar 12mm', kind: 'material', category: 'Steel', location: 'Tripoli', source: 'Cedar Supplies', price: 'USD 620 / ton' },
  { id: 'dir_03', name: 'Plywood 18mm', kind: 'material', category: 'Wood', location: 'Zahle', source: 'Cedar Supplies', price: 'USD 18.00' },
  { id: 'dir_04', name: 'Tempered glass 10mm', kind: 'material', category: 'Glass', location: 'Jounieh', source: 'Levant Glass', price: 'USD 42.00 / m²' },
  { id: 'dir_05', name: 'Tower crane 8t', kind: 'equipment', category: 'Lifting', location: 'Beirut', source: 'Levant Equip', price: 'USD 180 / day' },
  { id: 'dir_06', name: 'Excavator 20t', kind: 'equipment', category: 'Earthwork', location: 'Tripoli', source: 'Levant Equip', price: 'USD 220 / day' },
  { id: 'dir_07', name: 'Concrete mixer 1.5m³', kind: 'equipment', category: 'Concrete', location: 'Zahle', source: 'Levant Equip', price: 'USD 55 / day' },
  { id: 'dir_08', name: 'Scaffold set', kind: 'equipment', category: 'Access', location: 'Saida', source: 'Cedar Supplies', price: 'USD 28 / day' },
  { id: 'dir_09', name: 'Hassan Farah', kind: 'worker', category: 'Masonry', location: 'Beirut', source: 'Verified worker', price: 'USD 45 / day' },
  { id: 'dir_10', name: 'Rami Khatib', kind: 'worker', category: 'Electrical', location: 'Tripoli', source: 'Requested', price: 'USD 50 / day' },
  { id: 'dir_11', name: 'Maya Nassar', kind: 'worker', category: 'Plumbing', location: 'Jounieh', source: 'Verified worker', price: 'USD 48 / day' },
]

export const MOCK_REVIEWS: PlatformReview[] = [
  {
    id: 'rev_01',
    authorName: 'Sami Aoun',
    authorEmail: 'guest.home@example.com',
    targetType: 'provider',
    targetName: 'Steel Works Co.',
    rating: 5,
    comment: 'On-time delivery and clear specs. Would use again.',
    status: 'accepted',
    createdAt: isoDaysAgo(2),
  },
  {
    id: 'rev_02',
    authorName: 'Karim Mansour',
    authorEmail: 'pm.karim@example.com',
    targetType: 'listing',
    targetName: 'Rebar 12mm',
    rating: 4,
    comment: 'Price matched the listing. Quality was fine for the slab.',
    status: 'pending',
    createdAt: isoDaysAgo(1),
  },
  {
    id: 'rev_03',
    authorName: 'Lina Chamoun',
    authorEmail: 'pm.lina@example.com',
    targetType: 'worker',
    targetName: 'Hassan Farah',
    rating: 5,
    comment: 'Reliable mason. Communicated outside the platform as expected.',
    status: 'accepted',
    createdAt: isoDaysAgo(4),
  },
  {
    id: 'rev_04',
    authorName: 'Sami Aoun',
    authorEmail: 'guest.home@example.com',
    targetType: 'provider',
    targetName: 'Cement Plus',
    rating: 2,
    comment: 'Rude on the phone. Review kept pending for moderation.',
    status: 'pending',
    createdAt: isoDaysAgo(0, 14),
  },
  {
    id: 'rev_05',
    authorName: 'Maya Saab',
    authorEmail: 'worker.maya@example.com',
    targetType: 'listing',
    targetName: 'Plywood 18mm',
    rating: 1,
    comment: 'Spam / off-topic. Hidden from the directory.',
    status: 'rejected',
    createdAt: isoDaysAgo(6),
  },
  {
    id: 'rev_06',
    authorName: 'Karim Mansour',
    authorEmail: 'pm.karim@example.com',
    targetType: 'listing',
    targetName: 'Tower crane 8t',
    rating: 3,
    comment: 'Informational only — rate was useful for planning.',
    status: 'accepted',
    createdAt: isoDaysAgo(8),
  },
  {
    id: 'rev_07',
    authorName: 'Lina Chamoun',
    authorEmail: 'pm.lina@example.com',
    targetType: 'worker',
    targetName: 'Maya Nassar',
    rating: 4,
    comment: 'Good plumber. Still waiting for admin to accept.',
    status: 'pending',
    createdAt: isoDaysAgo(3),
  },
  {
    id: 'rev_08',
    authorName: 'Sami Aoun',
    authorEmail: 'guest.home@example.com',
    targetType: 'provider',
    targetName: 'Levant Glass',
    rating: 1,
    comment: 'Contains personal attacks. Rejected.',
    status: 'rejected',
    createdAt: isoDaysAgo(10),
  },
]

export function findProjectById(id: string): AdminProject | undefined {
  return MOCK_PROJECTS.find((project) => project.id === id)
}

export function findUserById(id: string): AdminUserRow | undefined {
  return MOCK_USERS.find((user) => user.id === id)
}

export function findProviderShopById(id: string): ProviderShop | undefined {
  return MOCK_PROVIDER_SHOPS.find((shop) => shop.id === id)
}

export function matchesUserQuery(row: AdminUserRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [
    row.email,
    row.role,
    row.status,
    row.profile.firstName,
    row.profile.lastName,
    row.profile.displayName,
    row.profile.phone,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}
