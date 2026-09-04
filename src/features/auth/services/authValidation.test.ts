import { describe, expect, it } from 'vitest';
import { validateLoginPasscode } from './authValidation';

describe('validateLoginPasscode', () => {
  it('6桁の数字だけをログインパスコードとして受け付ける', () => {
    expect(validateLoginPasscode('123456')).toEqual({ success: true });
    expect(validateLoginPasscode('12345')).toEqual({
      message: 'ログインパスコードは6桁の数字で入力してください。',
      success: false,
    });
  });
});
