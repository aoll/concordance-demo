import { ApiError } from '@concordance/api-client';
import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';

describe('errorMessage', () => {
  it('traduit le code métier ZONE_FULL', () => {
    const error = new ApiError(409, { statusCode: 409, code: 'ZONE_FULL', message: 'full' });
    expect(errorMessage(error)).toMatch(/complétée/);
  });

  it('retombe sur un message générique', () => {
    expect(errorMessage(new Error('réseau'))).toMatch(/Réessayez/);
  });
});
