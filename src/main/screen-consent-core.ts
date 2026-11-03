// Pure rule for screen recording consent. No Electron imports, so it runs under plain Node.
// Recording needs a token the main process issued, and the token works once.
import { createConsentStore, type ConsentStore } from './consent-core.ts'

export type ScreenDecision = { ok: true } | { ok: false; error: string }

export const SCREEN_NOT_ACKNOWLEDGED = 'Screen recording notice not accepted. Accept the notice and try again.'

// Takes a token, checks it, and removes it. Returns the consent time when it is valid.
export function redeemScreenToken(store: ConsentStore, token: unknown, now: number): ScreenDecision {
  if (typeof token !== 'string' || token.length === 0) return { ok: false, error: SCREEN_NOT_ACKNOWLEDGED }
  const consentAt = store.redeem(token, now)
  if (consentAt === null) return { ok: false, error: SCREEN_NOT_ACKNOWLEDGED }
  return { ok: true }
}

export { createConsentStore }
