import { z } from 'zod';

const emailAddressSchema = z.email({
  error: 'メールアドレスは有効な形式で入力してください。',
});
const loginPasscodeSchema = z.string().regex(/^\d{6}$/, {
  message: 'ログインパスコードは6桁の数字で入力してください。',
});

export function validateEmailAddress(value: string): { message: string; success: false } | { success: true } {
  const result = emailAddressSchema.safeParse(value);

  if (!result.success) {
    return {
      message: result.error.issues[0]?.message ?? 'メールアドレスを確認してください。',
      success: false,
    };
  }

  return { success: true };
}

export function validateLoginPasscode(value: string): { message: string; success: false } | { success: true } {
  const result = loginPasscodeSchema.safeParse(value);

  if (!result.success) {
    return {
      message: result.error.issues[0]?.message ?? 'ログインパスコードを確認してください。',
      success: false,
    };
  }

  return { success: true };
}
