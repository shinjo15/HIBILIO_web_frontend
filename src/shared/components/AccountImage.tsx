import { useState } from 'react';
import './accountImage.css';

type AccountAvatarProps = {
  className: string;
  iconImageUrl: string | null;
  initial: string;
};

type AccountHeaderImageProps = {
  headerImageUrl: string | null;
};

export function AccountAvatar({ className, iconImageUrl, initial }: AccountAvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  return <span aria-hidden="true" className={className}><span>{initial}</span>{iconImageUrl !== null && failedImageUrl !== iconImageUrl && <img alt="" className="account-avatar__image" onError={() => setFailedImageUrl(iconImageUrl)} src={iconImageUrl} />}</span>;
}

export function AccountHeaderImage({ headerImageUrl }: AccountHeaderImageProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  if (headerImageUrl === null || failedImageUrl === headerImageUrl) return null;

  return <img alt="" className="account-header-image" onError={() => setFailedImageUrl(headerImageUrl)} src={headerImageUrl} />;
}
