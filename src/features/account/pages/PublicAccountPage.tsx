import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AccountPost, AccountProfile, LikedRoutine } from '../domain/account';
import { registrationSocialPlatforms } from '../../auth/register/services/registrationSocialPlatforms';
import { publicAccountService, type PublicAccountService } from '../services/publicAccountService';
import messages from '../../../shared/message/message.json';
import '../account.css';

type PublicAccountPageProps = { service?: PublicAccountService };

export function PublicAccountPage({ service = publicAccountService }: PublicAccountPageProps) {
  const navigate = useNavigate();
  const { accountId = '' } = useParams<{ accountId: string }>();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [posts, setPosts] = useState<AccountPost[]>([]);
  const [likes, setLikes] = useState<LikedRoutine[]>([]);
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
    service.listPosts(accountId).then((result) => { if (!cancelled) setPosts(result); }).catch(() => {});
    service.listLikes(accountId).then((result) => { if (!cancelled) setLikes(result); }).catch(() => {});

    return () => { cancelled = true; };
  }, [accountId, service]);

  return (
    <section className="account-page">
      <header className="account-page__header">
        <button aria-label={messages.publicAccount.back} className="account-page__back" onClick={() => navigate(-1)} type="button">
          <BackIcon />
          <span>{messages.publicAccount.back}</span>
        </button>
      </header>
      {loadedAccountId !== accountId && <p className="account-page__state account-page__state--loading">{messages.publicAccount.loading}</p>}
      {loadedAccountId === accountId && hasError && <p className="account-page__state account-page__state--error">{messages.publicAccount.error}</p>}
      {loadedAccountId === accountId && !hasError && profile === null && <p className="account-page__state">{messages.publicAccount.notFound}</p>}
      {loadedAccountId === accountId && !hasError && profile !== null && (
        <div className="account-page__content">
          <section className="account-profile">
            <div className="account-profile__banner">
              <span aria-hidden="true" className="account-profile__avatar">{profile.initial}</span>
            </div>
            <div className="account-profile__body account-profile__body--without-actions">
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
          <section className="account-page__list" aria-label={messages.account.tabs.posts}>
            <h2>{messages.account.tabs.posts}</h2>
            {posts.map((post) => <button className="account-page__card" key={post.id} onClick={() => navigate(`/routines/${post.routineId}`)} type="button"><div className="account-page__card-body"><h3 className="account-page__card-title">{post.title}</h3></div></button>)}
          </section>
          <section className="account-page__list" aria-label={messages.account.tabs.likes}>
            <h2>{messages.account.tabs.likes}</h2>
            {likes.map((like) => <button className="account-page__card" key={like.postId} onClick={() => navigate(`/routines/${like.routineId}`)} type="button"><div className="account-page__card-body"><h3 className="account-page__card-title">{like.title}</h3><p className="account-profile__handle">{like.authorName}</p></div></button>)}
          </section>
        </div>
      )}
    </section>
  );
}

function BackIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>;
}
