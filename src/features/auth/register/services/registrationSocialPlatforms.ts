import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ForumIcon from '@mui/icons-material/Forum';
import InstagramIcon from '@mui/icons-material/Instagram';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import type { ComponentType } from 'react';

export type RegistrationSocialPlatform = {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  placeholder: string;
  socialType: 'bereal' | 'discord' | 'instagram' | 'threads' | 'tiktok' | 'twitch' | 'x' | 'youtube';
  urlPrefix: string;
};

export const registrationSocialPlatforms: readonly RegistrationSocialPlatform[] = [
  { Icon: XIcon, label: 'X (Twitter)', placeholder: 'ユーザー名（@なし）', socialType: 'x', urlPrefix: 'https://x.com/' },
  { Icon: InstagramIcon, label: 'Instagram', placeholder: 'ユーザー名', socialType: 'instagram', urlPrefix: 'https://instagram.com/' },
  { Icon: MusicNoteIcon, label: 'TikTok', placeholder: 'ユーザー名（@なし）', socialType: 'tiktok', urlPrefix: 'https://tiktok.com/@' },
  { Icon: YouTubeIcon, label: 'YouTube', placeholder: 'チャンネル名', socialType: 'youtube', urlPrefix: 'https://youtube.com/@' },
  { Icon: ForumIcon, label: 'Threads', placeholder: 'ユーザー名', socialType: 'threads', urlPrefix: 'https://www.threads.net/@' },
  { Icon: VideogameAssetIcon, label: 'Twitch', placeholder: 'ユーザー名', socialType: 'twitch', urlPrefix: 'https://www.twitch.tv/' },
  { Icon: ForumIcon, label: 'Discord', placeholder: '招待URL', socialType: 'discord', urlPrefix: '' },
  { Icon: CameraAltIcon, label: 'BeReal', placeholder: 'プロフィールURL', socialType: 'bereal', urlPrefix: '' },
];
