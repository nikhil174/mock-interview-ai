import type { MockApi } from '../shared/api'

declare global {
  interface Window {
    api: MockApi
  }
}

export {}
