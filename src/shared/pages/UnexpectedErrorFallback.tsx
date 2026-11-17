import messages from '../message/message.json';
import './unexpectedErrorPage.css';

export function UnexpectedErrorFallback() {
  return (
    <main aria-labelledby="unexpected-error-page-title" className="unexpected-error-page unexpected-error-page--fallback">
      <section className="unexpected-error-page__content">
        <span aria-hidden="true" className="unexpected-error-page__fallback-icon">!</span>
        <h1 id="unexpected-error-page-title">{messages.unexpectedError.title}</h1>
        <p role="alert">{messages.unexpectedError.description}</p>
        <p className="unexpected-error-page__note">{messages.unexpectedError.friendlyNote}</p>
        <div className="unexpected-error-page__actions">
          <a className="unexpected-error-page__fallback-action unexpected-error-page__fallback-action--primary" href={window.location.href}>{messages.unexpectedError.retry}</a>
          <a className="unexpected-error-page__fallback-action" href="/home">Homeへ戻る</a>
        </div>
      </section>
    </main>
  );
}