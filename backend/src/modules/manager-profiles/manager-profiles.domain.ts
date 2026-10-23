export const managerProfilesDomain = {
  name: 'manager-profiles',
  description: 'Optional CV / additional professional info for project managers.',
  owns: ['ManagerProfile'],
  publicOperations: ['getMine', 'upsertMine', 'deleteMine'],
}
