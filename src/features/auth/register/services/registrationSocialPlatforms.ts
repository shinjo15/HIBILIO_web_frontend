import { SiBereal, SiDiscord, SiInstagram, SiThreads, SiTiktok, SiTwitch, SiX, SiYoutube } from 'react-icons/si';
import type { ComponentType } from 'react';

export type RegistrationSocialPlatform = {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  placeholder: string;
  socialType: 'bereal' | 'discord' | 'instagram' | 'threads' | 'tiktok' | 'twitch' | 'x' | 'youtube';
  urlPrefix: string;
};

export const registrationSocialPlatforms: readonly RegistrationSocialPlatform[] = [
  { Icon: SiX, label: 'X (Twitter)', placeholder: 'ユーザー名（@なし）', socialType: 'x', urlPrefix: 'https://x.com/' },
  { Icon: SiInstagram, label: 'Instagram', placeholder: 'ユーザー名', socialType: 'instagram', urlPrefix: 'https://instagram.com/' },
  { Icon: SiTiktok, label: 'TikTok', placeholder: 'ユーザー名（@なし）', socialType: 'tiktok', urlPrefix: 'https://tiktok.com/@' },
  { Icon: SiYoutube, label: 'YouTube', placeholder: 'チャンネル名', socialType: 'youtube', urlPrefix: 'https://youtube.com/@' },
  { Icon: SiThreads, label: 'Threads', placeholder: 'ユーザー名', socialType: 'threads', urlPrefix: 'https://www.threads.net/@' },
  { Icon: SiTwitch, label: 'Twitch', placeholder: 'ユーザー名', socialType: 'twitch', urlPrefix: 'https://www.twitch.tv/' },
  { Icon: SiDiscord, label: 'Discord', placeholder: '招待URL', socialType: 'discord', urlPrefix: '' },
  { Icon: SiBereal, label: 'BeReal', placeholder: 'プロフィールURL', socialType: 'bereal', urlPrefix: '' },
];
