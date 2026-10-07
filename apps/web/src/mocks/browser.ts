import { createMockApi } from '@concordance/api-client/mocks';
import { setupWorker } from 'msw/browser';
import { MOCK_EVENT } from '../live/source';

// Écritures ralenties pour voir la mise à jour optimiste avant la réponse du faux back.
// Les événements temps réel du faux back passent par un événement DOM (voir live/source.ts).
export const mockApi = createMockApi({
  latency: 600,
  onEvent: (detail) => window.dispatchEvent(new CustomEvent(MOCK_EVENT, { detail })),
});
export const worker = setupWorker(...mockApi.handlers);

declare global {
  interface Window {
    /** Pilote le faux back depuis la console ou un test (ex. remplir une zone). */
    concordanceMocks?: typeof mockApi;
  }
}
window.concordanceMocks = mockApi;
