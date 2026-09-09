import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { AccountProfile } from '../domain/account';
import { registrationSocialPlatforms } from '../../auth/register/services/registrationSocialPlatforms';
import { publicAccountService, type PublicAccountService } from '../services/publicAccountService';
import messages from '../../../shared/message/message.json';
import '../account.css';

type PublicAccountPageProps = { service?: PublicAccountService };

export function PublicAccountPage({ service = publicAccountService }: PublicAccountPageProps) {
  const { accountId = '' } = useParams<{ accountId: string }>();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loadedAccountId, setLoadedAccountId] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    service.get(accountId).then((result) => {
      if (!cancelled) {
        setProfile(result);
        setHasError(false);
        setLoadedAccountId(accountId);
      }
    }).catch(() => {
      if (!cancelled) {
        setProfile(null);
        setHasError(true);
        setLoadedAccountId(accountId);
      }
    });

    return () => { cancelled = true; };
  }, [accountId, service]);

  if (loadedAccountId !== accountId) {
    return <p className="account-page__state account-page__state--loading">{messages.publicAccount.loading}</p>;
  }

  if (hasError) {
    return <p className="account-page__state account-page__state--error">{messages.publicAccount.error}</p>;
  }

  if (profile === null) {
    return <p className="account-page__state">{messages.publicAccount.notFound}</p>;
  }

  return (
    <section className="account-page">
      <div className="account-page__content">
        <section className="account-profile">
          <div className="account-profile__banner">
            <span aria-hidden="true" className="account-profile__avatar">{profile.initial}</span>
          </div>
          <div className="account-profile__body">
            <div className="account-profile__details">
              <h1 className="account-profile__name">{profile.name}</h1>
              {profile.bio !== null && <p className="account-profile__bio">{profile.bio}</p>}
              {profile.socialLinks.length > 0 && <div className="account-profile__social-links">
                {profile.socialLinks.map((link) => {
                  const platform = registrationSocialPlatforms.find((item) => item.socialType === link.socialType);
                  return platform === undefined ? null : <a className="account-profile__social-link" href={link.socialUrl} key={link.socialType} rel="noreferrer" target="_blank"><platform.Icon className={`account-profile__social-icon account-profile__social-icon--${link.socialType}`} /><span>{link.socialUrl.replace(platform.urlPrefix, '')}</span></a>;
                })}
              </div>}
              {profile.favoriteTags.length > 0 && <div className="account-profile__favorite-tags">
                {profile.favoriteTags.map((tag) => <span className="account-profile__favorite-tag" key={tag.id}>{tag.name}</span>)}
              </div>}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
