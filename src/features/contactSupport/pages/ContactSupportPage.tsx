import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import { ContactSupportError, contactSupportService, validateContactSupport, type ContactSupportService } from '../services/contactSupportService';
import './contactSupport.css';

type ContactSupportPageProps = { service?: ContactSupportService };

export function ContactSupportPage({ service = contactSupportService }: ContactSupportPageProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validateContactSupport({ content, title });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(Object.fromEntries(Object.entries(validationErrors).map(([field, errorKey]) => [field, messages.contactSupport.validation[errorKey]])));
      return;
    }

    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await service.create({ content, title });
      setIsSubmitted(true);
    } catch (caughtError) {
      if (caughtError instanceof ContactSupportError && caughtError.status === 422 && caughtError.fieldErrors !== undefined) {
        setFieldErrors(Object.fromEntries(Object.entries(caughtError.fieldErrors).map(([field, errors]) => [field, errors[0] ?? ''])));
      } else if (caughtError instanceof ContactSupportError && caughtError.status === 401) {
        setError(messages.contactSupport.unauthorizedError);
      } else if (caughtError instanceof ContactSupportError && caughtError.status === 429) {
        setError(messages.contactSupport.rateLimitError);
      } else if (caughtError instanceof ContactSupportError && caughtError.status !== undefined) {
        setError(messages.contactSupport.serverError);
      } else {
        setError(messages.contactSupport.networkError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return <section className="contact-support">
    <header className="contact-support__header">
      <Link aria-label={messages.contactSupport.back} className="contact-support__back" to="/account"><BackIcon /><span>{messages.contactSupport.back}</span></Link>
      <h1 className="contact-support__header-title">{messages.contactSupport.title}</h1>
      <span aria-hidden="true" className="contact-support__header-spacer" />
    </header>
    <main className="contact-support__scroll"><div className="contact-support__content">
      {isSubmitted ? <section className="contact-support__state"><p role="status">{messages.contactSupport.success}</p></section> : <form className="contact-support__form" onSubmit={(event) => void submit(event)}>
        {error !== null && <p className="contact-support__form-error" role="alert">{error}</p>}
        <div className="contact-support__field"><label htmlFor="contact-support-title">{messages.contactSupport.titleLabel}</label><input aria-invalid={fieldErrors.title !== undefined} className={fieldErrors.title === undefined ? 'contact-support__input' : 'contact-support__input contact-support__input--error'} id="contact-support-title" onChange={(event) => setTitle(event.target.value)} value={title} />{fieldErrors.title !== undefined && <span className="contact-support__field-error" role="alert">{fieldErrors.title}</span>}</div>
        <div className="contact-support__field"><label htmlFor="contact-support-content">{messages.contactSupport.contentLabel}</label><textarea aria-invalid={fieldErrors.content !== undefined} className={fieldErrors.content === undefined ? 'contact-support__input contact-support__input--textarea' : 'contact-support__input contact-support__input--textarea contact-support__input--error'} id="contact-support-content" onChange={(event) => setContent(event.target.value)} value={content} />{fieldErrors.content !== undefined && <span className="contact-support__field-error" role="alert">{fieldErrors.content}</span>}</div>
        <button className="contact-support__submit" disabled={isSubmitting} type="submit">{messages.contactSupport.submit}</button>
      </form>}
    </div></main>
  </section>;
}

function BackIcon() {
  return <svg aria-hidden="true" className="contact-support__back-icon" fill="none" height="20" viewBox="0 0 24 24" width="20"><polyline points="15 18 9 12 15 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}
