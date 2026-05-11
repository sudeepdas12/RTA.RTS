import { getApiErrorMessage } from '../services/api';

describe('API error helpers', () => {
  test('returns normalized friendly message when available', () => {
    const error = { friendlyMessage: 'Access denied' };
    expect(getApiErrorMessage(error, 'Fallback')).toBe('Access denied');
  });

  test('falls back to response message and then fallback', () => {
    const errorWithResponse = { response: { data: { message: 'Backend message' } } };
    expect(getApiErrorMessage(errorWithResponse, 'Fallback')).toBe('Backend message');

    const genericError = {};
    expect(getApiErrorMessage(genericError, 'Fallback')).toBe('Fallback');
  });
});
