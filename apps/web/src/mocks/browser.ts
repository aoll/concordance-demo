import { createMockApi } from '@concordance/api-client/mocks';
import { setupWorker } from 'msw/browser';

// Écritures ralenties pour voir la mise à jour optimiste avant la réponse du faux back.
export const mockApi = createMockApi({ latency: 600 });
export const worker = setupWorker(...mockApi.handlers);

declare global {
  interface Window {
    /** Pilote le faux back depuis la console ou un test (ex. remplir une zone). */
    concordanceMocks?: typeof mockApi;
  }
}
window.concordanceMocks = mockApi;
