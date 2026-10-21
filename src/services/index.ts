/**
 * The single place the app chooses its data source.
 * Replace `mockApi` with an HTTP implementation of `NenaivuApi` when a backend exists.
 */
import type { NenaivuApi } from './api'
import { mockApi } from './mock/mockApi'

export const api: NenaivuApi = mockApi
export const USING_MOCK_SERVICE = true

export * from './api'
