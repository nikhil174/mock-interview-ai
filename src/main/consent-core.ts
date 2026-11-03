// Pure consent logic. No Electron imports, so it can be tested under plain Node.
// The main process owns the consent state; the renderer only ever holds an opaque token.

export const TOKEN_TTL_MS = 10 * 60 * 1000

export interface ConsentStore {
  issue(token: string, now: number): void
  redeem(token: string, now: number): number | null
  attest(requestId: string, consentAt: number): void
  takeAttestation(requestId: string): number | null
}

export function createConsentStore(): ConsentStore {
  const issued = new Map<string, number>()
  const attested = new Map<string, number>()

  return {
    issue(token, now) {
      issued.set(token, now)
    },
    // A token works once. Using it, or letting it expire, removes it.
    redeem(token, now) {
      const issuedAt = issued.get(token)
      issued.delete(token)
      if (issuedAt === undefined) return null
      if (now - issuedAt > TOKEN_TTL_MS) return null
      return issuedAt
    },
    attest(requestId, consentAt) {
      attested.set(requestId, consentAt)
    },
    // Each feedback request can be saved at most once.
    takeAttestation(requestId) {
      const consentAt = attested.get(requestId) ?? null
      attested.delete(requestId)
      return consentAt
    }
  }
}

export type Decision = { ok: true } | { ok: false; error: string }

export const NOT_ACKNOWLEDGED =
  'Practice notice not acknowledged. Accept the notice and try again.'

// Called by feedback:start. Rejects any request whose token the main process did not issue
// (or that was already used or has expired), and records the consent time the main process saw.
export function authorizeFeedback(
  store: ConsentStore,
  token: unknown,
  requestId: string,
  now: number
): Decision {
  if (typeof token !== 'string' || token.length === 0) {
    return { ok: false, error: NOT_ACKNOWLEDGED }
  }
  const consentAt = store.redeem(token, now)
  if (consentAt === null) return { ok: false, error: NOT_ACKNOWLEDGED }
  store.attest(requestId, consentAt)
  return { ok: true }
}

// Called by sessions:save. Only a request that passed authorizeFeedback can be saved,
// and the consent time comes from the main process, not from the renderer.
export function consentForSave(
  store: ConsentStore,
  requestId: string
): { ok: true; consentAt: number } | { ok: false; error: string } {
  const consentAt = store.takeAttestation(requestId)
  if (consentAt === null) {
    return { ok: false, error: 'This session has no acknowledged practice notice, so it was not saved.' }
  }
  return { ok: true, consentAt }
}
