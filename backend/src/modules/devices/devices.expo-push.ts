import type { NotifyUserPayload } from './devices.types.js'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export type ExpoPushTicket = {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

export type ExpoPushSendResult = {
  tickets: ExpoPushTicket[]
  invalidTokens: string[]
}

type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, string>
  sound?: 'default'
}

/**
 * Sync Expo Push HTTP send. Best-effort — callers should not fail business flows on errors.
 */
export async function sendExpoPush(
  tokens: string[],
  payload: NotifyUserPayload,
  options: { accessToken?: string } = {},
): Promise<ExpoPushSendResult> {
  if (tokens.length === 0) {
    return { tickets: [], invalidTokens: [] }
  }

  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: 'default',
  }))

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  }
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Expo Push HTTP ${response.status}: ${text.slice(0, 200)}`)
  }

  const json = (await response.json()) as { data?: ExpoPushTicket | ExpoPushTicket[] }
  const tickets = Array.isArray(json.data) ? json.data : json.data ? [json.data] : []

  const invalidTokens: string[] = []
  for (let i = 0; i < tickets.length; i += 1) {
    const ticket = tickets[i]
    if (
      ticket?.status === 'error' &&
      ticket.details?.error === 'DeviceNotRegistered' &&
      tokens[i]
    ) {
      invalidTokens.push(tokens[i])
    }
  }

  return { tickets, invalidTokens }
}
