import { useAlertStore } from '@/stores/alertStore'

beforeEach(() => useAlertStore.getState().dismiss())

describe('alertStore', () => {
  it('shows an alert with a default confirm label and unique ids', () => {
    const { show } = useAlertStore.getState()
    show({ title: 'T', message: 'M' })
    const first = useAlertStore.getState().current
    expect(first).toMatchObject({ title: 'T', message: 'M', confirmLabel: 'OK' })

    show({ title: 'T2', message: 'M2', confirmLabel: 'Delete', cancelLabel: 'Cancel' })
    const second = useAlertStore.getState().current
    expect(second?.confirmLabel).toBe('Delete')
    expect(second?.cancelLabel).toBe('Cancel')
    expect(second?.id).not.toBe(first?.id)
  })

  it('dismiss clears the current alert', () => {
    useAlertStore.getState().show({ title: 'T', message: 'M' })
    useAlertStore.getState().dismiss()
    expect(useAlertStore.getState().current).toBeNull()
  })

  it('carries an explicit destructive flag through to the alert', () => {
    useAlertStore.getState().show({
      title: 'T',
      message: 'M',
      confirmLabel: 'أرشفة',
      cancelLabel: 'إلغاء',
      destructive: true,
    })
    expect(useAlertStore.getState().current?.destructive).toBe(true)
  })
})
