export type RegistrationSocialPlatform = {
  label: string;
  placeholder: string;
  socialType: 'discord' | 'instagram' | 'tiktok' | 'x' | 'youtube';
  urlPrefix: string;
};

export const registrationSocialPlatforms: readonly RegistrationSocialPlatform[] = [
  { label: 'X (Twitter)', placeholder: 'ユーザー名（@なし）', socialType: 'x', urlPrefix: 'https://x.com/' },
  { label: 'Instagram', placeholder: 'ユーザー名', socialType: 'instagram', urlPrefix: 'https://instagram.com/' },
  { label: 'YouTube', placeholder: 'チャンネル名', socialType: 'youtube', urlPrefix: 'https://youtube.com/@' },
  { label: 'TikTok', placeholder: 'ユーザー名（@なし）', socialType: 'tiktok', urlPrefix: 'https://tiktok.com/@' },
  { label: 'Discord', placeholder: '招待URL', socialType: 'discord', urlPrefix: '' },
];
