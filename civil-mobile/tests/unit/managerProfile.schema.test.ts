import { formFromManagerProfile, managerProfileSchema } from '@/features/pm/managerProfile.schema'

describe('managerProfileSchema', () => {
  const empty = formFromManagerProfile(null)

  it('maps every blank field to null for the full-replace PUT', () => {
    const result = managerProfileSchema.safeParse(empty)
    expect(result.success).toBe(true)
    if (result.success) expect(Object.values(result.data).every((v) => v === null)).toBe(true)
  })

  it('parses years as an integer', () => {
    const result = managerProfileSchema.safeParse({ ...empty, yearsExperience: '12' })
    expect(result.success && result.data.yearsExperience).toBe(12)
  })

  it('rejects non-numeric years and invalid URLs', () => {
    expect(managerProfileSchema.safeParse({ ...empty, yearsExperience: 'ten' }).success).toBe(false)
    expect(managerProfileSchema.safeParse({ ...empty, linkedinUrl: 'linkedin' }).success).toBe(
      false,
    )
  })
})
