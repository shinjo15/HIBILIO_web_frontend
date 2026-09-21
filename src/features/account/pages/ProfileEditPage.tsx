import { Alert, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import { clearAuthenticated } from '../../auth/services/authSession';
import { registrationSocialPlatforms, type RegistrationSocialPlatform } from '../../auth/register/services/registrationSocialPlatforms';
import { profileEditService, ProfileEditUnauthorizedError, type EditableProfile, type ProfileEditService, type TagCandidate } from '../services/profileEditService';
import { AccountHeaderImage } from '../../../shared/components/AccountImage';
import './profileEdit.css';

type ProfileEditPageProps = { service?: ProfileEditService };

export function ProfileEditPage({ service = profileEditService }: ProfileEditPageProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [headerPreviewUrl, setHeaderPreviewUrl] = useState<string | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<RegistrationSocialPlatform | null>(null);
  const [socialLinkValue, setSocialLinkValue] = useState('');
  const [tagCandidates, setTagCandidates] = useState<TagCandidate[]>([]);
  const [tagQuery, setTagQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    service.load()
      .then((loadedProfile) => {
        if (!cancelled) setProfile(loadedProfile);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        if (loadError instanceof ProfileEditUnauthorizedError) {
          clearAuthenticated();
          navigate('/login');
          return;
        }
        setError(messages.profileEdit.loadError);
      });

    service.loadTagCandidates()
      .then((candidates) => {
        if (!cancelled) setTagCandidates(candidates);
      })
      .catch(() => {
        if (!cancelled) setError(messages.profileEdit.loadError);
      });

    return () => { cancelled = true; };
  }, [navigate, service]);

  useEffect(() => () => {
    if (headerPreviewUrl !== null) URL.revokeObjectURL(headerPreviewUrl);
    if (iconPreviewUrl !== null) URL.revokeObjectURL(iconPreviewUrl);
  }, [headerPreviewUrl, iconPreviewUrl]);

  if (profile === null) return <p className="profile-edit__state">{error ?? messages.account.loading}</p>;
  const editingProfile = profile;

  function update<K extends keyof EditableProfile>(key: K, value: EditableProfile[K]) {
    setProfile((current) => current === null ? current : { ...current, [key]: value });
  }

  function selectImage(type: 'header' | 'icon', file: File | null) {
    if (type === 'header') {
      update('headerImage', file);
      setHeaderPreviewUrl(file === null ? null : URL.createObjectURL(file));
      return;
    }
    update('iconImage', file);
    setIconPreviewUrl(file === null ? null : URL.createObjectURL(file));
  }

  async function save() {
    if (editingProfile.name.trim() === '') { setError(messages.profileEdit.required); return; }
    setError(null); setIsSaving(true);
    try {
      await service.save(editingProfile);
      navigate('/account');
    } catch (saveError: unknown) {
      if (saveError instanceof ProfileEditUnauthorizedError) {
        clearAuthenticated();
        navigate('/login');
        return;
      }
      setError(messages.profileEdit.saveError);
    } finally { setIsSaving(false); }
  }

  function addSocialLink() {
    if (selectedPlatform === null || socialLinkValue.trim() === '') return;
    update('socialLinks', [...editingProfile.socialLinks.filter((link) => link.socialType !== selectedPlatform.socialType), { socialType: selectedPlatform.socialType, socialUrl: `${selectedPlatform.urlPrefix}${socialLinkValue.trim()}` }]);
    setSelectedPlatform(null);
    setSocialLinkValue('');
  }

  function addFavoriteTag(tag: TagCandidate) {
    const normalizedTag = tag.label.trim();
    if (normalizedTag === '' || editingProfile.favoriteTags.some((item) => item.label === normalizedTag)) return;
    update('favoriteTags', [...editingProfile.favoriteTags, { ...tag, label: normalizedTag }]);
    setTagQuery('');
  }

  return <main className="profile-edit">
    <header className="profile-edit__header"><Button aria-label={messages.profileEdit.back} onClick={() => navigate('/account')} type="button" variant="text">←</Button><h1>{messages.profileEdit.title}</h1></header>
    <section className="profile-edit__content">
      {error !== null && <Alert severity="error">{error}</Alert>}
      <div className="profile-edit__header-image"><AccountHeaderImage headerImageUrl={headerPreviewUrl ?? editingProfile.headerImageUrl ?? null} /><label><span>{messages.profileEdit.changeHeader}</span><input accept="image/png,image/jpeg,image/webp" onChange={(event) => selectImage('header', event.target.files?.[0] ?? null)} type="file" /></label></div>
      <div className="profile-edit__avatar"><AccountHeaderImage headerImageUrl={iconPreviewUrl ?? editingProfile.iconImageUrl ?? null} /><span>{(iconPreviewUrl ?? editingProfile.iconImageUrl) === null && editingProfile.name.slice(0, 1).toUpperCase()}</span><label><span>{messages.profileEdit.changeIcon}</span><input accept="image/png,image/jpeg,image/webp" onChange={(event) => selectImage('icon', event.target.files?.[0] ?? null)} type="file" /></label></div>
      <label><span>{messages.profileEdit.name}</span><input maxLength={50} onChange={(event) => update('name', event.target.value)} value={editingProfile.name} /></label>
      <label><span>{messages.profileEdit.bio}</span><textarea maxLength={300} onChange={(event) => update('bio', event.target.value)} rows={4} value={editingProfile.bio} /></label>
      <section className="profile-edit__social"><h2>{messages.profileEdit.socialLinks}</h2>{editingProfile.socialLinks.map((link) => { const platform = registrationSocialPlatforms.find((item) => item.socialType === link.socialType); return platform === undefined ? null : <div className="profile-edit__social-card" key={link.socialType}><platform.Icon className={`hibilio-register__social-icon hibilio-register__social-icon--${link.socialType}`} /><span>{link.socialUrl}</span><Button onClick={() => update('socialLinks', editingProfile.socialLinks.filter((item) => item.socialType !== link.socialType))} type="button" variant="text">{messages.profileEdit.remove}</Button></div>; })}{selectedPlatform === null ? <div className="profile-edit__social-platforms">{registrationSocialPlatforms.filter((platform) => !editingProfile.socialLinks.some((link) => link.socialType === platform.socialType)).map((platform) => <Button key={platform.socialType} onClick={() => setSelectedPlatform(platform)} startIcon={<platform.Icon className={`hibilio-register__social-icon hibilio-register__social-icon--${platform.socialType}`} />} type="button" variant="outlined">{platform.label}</Button>)}</div> : <div className="profile-edit__social-add"><input onChange={(event) => setSocialLinkValue(event.target.value)} placeholder={selectedPlatform.placeholder} value={socialLinkValue} /><Button onClick={addSocialLink} type="button" variant="contained">{messages.profileEdit.add}</Button><Button onClick={() => setSelectedPlatform(null)} type="button" variant="text">{messages.profileEdit.cancel}</Button></div>}</section>
      <section className="profile-edit__favorite-tags"><h2>{messages.profileEdit.favoriteTags}</h2><div className="profile-edit__selected-tags">{editingProfile.favoriteTags.map((tag) => <button aria-label={`${tag.label}${messages.profileEdit.remove}`} key={tag.identifier} onClick={() => update('favoriteTags', editingProfile.favoriteTags.filter((item) => item.identifier !== tag.identifier))} type="button">{tag.label} ×</button>)}</div><input aria-label={messages.profileEdit.tagSearchPlaceholder} onChange={(event) => setTagQuery(event.target.value)} placeholder={messages.profileEdit.tagSearchPlaceholder} value={tagQuery} /><div className="profile-edit__available-tags">{tagCandidates.filter((tag) => !editingProfile.favoriteTags.some((item) => item.identifier === tag.identifier) && (tagQuery.trim() === '' || tag.label.includes(tagQuery.trim()))).map((tag) => <button key={tag.identifier} onClick={() => addFavoriteTag(tag)} type="button">+ {tag.label}</button>)}</div></section>
      <section className="profile-edit__other"><h2>{messages.profileEdit.other}</h2><Button onClick={() => setError(messages.profileEdit.emailChangeUnavailable)} type="button" variant="outlined">{messages.profileEdit.changeEmail}</Button></section>
      <Button className="profile-edit__save" disabled={isSaving} fullWidth onClick={() => void save()} type="button" variant="contained">{messages.profileEdit.save}</Button>
    </section>
  </main>;
}
