import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import messages from '../message/message.json';
import './unexpectedErrorPage.css';

type UnexpectedErrorContentProps = {
  renderRetry: (className: string) => React.ReactNode;
  renderHomeLink: (className: string) => React.ReactNode;
};

export function UnexpectedErrorContent({ renderRetry, renderHomeLink }: UnexpectedErrorContentProps) {
  return (
    <main aria-labelledby="unexpected-error-page-title" className="unexpected-error-page">
      <section className="unexpected-error-page__content">
        <ErrorOutlineRoundedIcon aria-hidden="true" className="unexpected-error-page__icon" color="primary" sx={{ fontSize: 104, mb: 3 }} />
        <h1 id="unexpected-error-page-title">{messages.unexpectedError.title}</h1>
        <p role="alert">{messages.unexpectedError.description}</p>
        <p className="unexpected-error-page__note">{messages.unexpectedError.friendlyNote}</p>
        <div className="unexpected-error-page__actions">
          {renderRetry('unexpected-error-page__retry')}
          {renderHomeLink('unexpected-error-page__home')}
        </div>
      </section>
    </main>
  );
}
