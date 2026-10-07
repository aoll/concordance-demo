import { ApiError } from '@concordance/api-client';
import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';

describe('errorMessage', () => {
  it('translates the ZONE_FULL business code', () => {
    const error = new ApiError(409, { statusCode: 409, code: 'ZONE_FULL', message: 'full' });
    expect(errorMessage(error)).toMatch(/complétée/);
  });

  it('falls back to a generic message', () => {
    expect(errorMessage(new Error('réseau'))).toMatch(/Réessayez/);
  });
});
