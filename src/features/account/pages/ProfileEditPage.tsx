import { Alert, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import { registrationSocialPlatforms, type RegistrationSocialPlatform } from '../../auth/register/services/registrationSocialPlatforms';
import { loadEditableProfile, saveEditableProfile, type EditableProfile } from '../services/profileEditDummyAdapter';
import './profileEdit.css';

export function ProfileEditPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<RegistrationSocialPlatform | null>(null);
  const [socialLinkValue, setSocialLinkValue] = useState('');

  useEffect(() => { void loadEditableProfile().then(setProfile).catch(() => setError(messages.profileEdit.loadError)); }, []);

  if (profile === null) return <p className="profile-edit__state">{messages.account.loading}</p>;
  const editingProfile = profile;

  function update<K extends keyof EditableProfile>(key: K, value: EditableProfile[K]) {
    setProfile((current) => current === null ? current : { ...current, [key]: value });
    setSaved(false);
  }

  async function save() {
    if (editingProfile.name.trim() === '' || editingProfile.handle.trim() === '') { setError(messages.profileEdit.required); return; }
    setError(null); setIsSaving(true);
    try { await saveEditableProfile(editingProfile); setSaved(true); } catch { setError(messages.profileEdit.saveError); } finally { setIsSaving(false); }
  }

  function addSocialLink() {
    if (selectedPlatform === null || socialLinkValue.trim() === '') return;
    update('socialLinks', [...editingProfile.socialLinks.filter((link) => link.socialType !== selectedPlatform.socialType), { socialType: selectedPlatform.socialType, socialUrl: `${selectedPlatform.urlPrefix}${socialLinkValue.trim()}` }]);
    setSelectedPlatform(null);
    setSocialLinkValue('');
  }

  return <main className="profile-edit">
    <header className="profile-edit__header"><Button aria-label={messages.profileEdit.back} onClick={() => navigate('/account')} type="button" variant="text">←</Button><h1>{messages.profileEdit.title}</h1><Button disabled={isSaving} onClick={() => void save()} type="button" variant="text">{messages.profileEdit.save}</Button></header>
    <section className="profile-edit__content">
      {error !== null && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">{messages.profileEdit.saved}</Alert>}
      <div className="profile-edit__header-image"><label><span>{messages.profileEdit.changeHeader}</span><input accept="image/png,image/jpeg,image/webp" onChange={(event) => update('headerImageName', event.target.files?.[0]?.name ?? null)} type="file" /></label></div>
      <div className="profile-edit__avatar"><span>{editingProfile.name.slice(0, 1).toUpperCase()}</span><label><span>{messages.profileEdit.changeIcon}</span><input accept="image/png,image/jpeg,image/webp" onChange={(event) => update('iconImageName', event.target.files?.[0]?.name ?? null)} type="file" /></label></div>
      <label><span>{messages.profileEdit.name}</span><input maxLength={50} onChange={(event) => update('name', event.target.value)} value={editingProfile.name} /></label>
      <label><span>{messages.profileEdit.handle}</span><input maxLength={20} onChange={(event) => update('handle', event.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())} value={editingProfile.handle} /></label>
      <label><span>{messages.profileEdit.bio}</span><textarea maxLength={300} onChange={(event) => update('bio', event.target.value)} rows={4} value={editingProfile.bio} /></label>
      <section className="profile-edit__social"><h2>{messages.profileEdit.socialLinks}</h2>{editingProfile.socialLinks.map((link) => { const platform = registrationSocialPlatforms.find((item) => item.socialType === link.socialType); return platform === undefined ? null : <div className="profile-edit__social-card" key={link.socialType}><platform.Icon className={`hibilio-register__social-icon hibilio-register__social-icon--${link.socialType}`} /><span>{link.socialUrl}</span><Button onClick={() => update('socialLinks', editingProfile.socialLinks.filter((item) => item.socialType !== link.socialType))} type="button" variant="text">{messages.profileEdit.remove}</Button></div>; })}{selectedPlatform === null ? <div className="profile-edit__social-platforms">{registrationSocialPlatforms.filter((platform) => !editingProfile.socialLinks.some((link) => link.socialType === platform.socialType)).map((platform) => <Button key={platform.socialType} onClick={() => setSelectedPlatform(platform)} startIcon={<platform.Icon className={`hibilio-register__social-icon hibilio-register__social-icon--${platform.socialType}`} />} type="button" variant="outlined">{platform.label}</Button>)}</div> : <div className="profile-edit__social-add"><input onChange={(event) => setSocialLinkValue(event.target.value)} placeholder={selectedPlatform.placeholder} value={socialLinkValue} /><Button onClick={addSocialLink} type="button" variant="contained">{messages.profileEdit.add}</Button><Button onClick={() => setSelectedPlatform(null)} type="button" variant="text">{messages.profileEdit.cancel}</Button></div>}</section>
      <section className="profile-edit__other"><h2>{messages.profileEdit.other}</h2><Button onClick={() => setError(messages.profileEdit.emailChangeUnavailable)} type="button" variant="outlined">{messages.profileEdit.changeEmail}</Button><p>{messages.profileEdit.apiUnavailable}</p></section>
      <Button className="profile-edit__save" disabled={isSaving} fullWidth onClick={() => void save()} type="button" variant="contained">{messages.profileEdit.save}</Button>
    </section>
  </main>;
}
