import { createMockApi } from '@concordance/api-client/mocks';
import { setupWorker } from 'msw/browser';

export const worker = setupWorker(...createMockApi().handlers);
