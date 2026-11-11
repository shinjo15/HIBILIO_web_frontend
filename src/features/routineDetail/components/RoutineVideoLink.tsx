import { useState } from 'react';
import messages from '../../../shared/message/message.json';
import { getRoutineVideoPresentation } from '../domain/routineVideo';

type RoutineVideoLinkProps = {
  videoUrl: string;
};

export function RoutineVideoLink({ videoUrl }: RoutineVideoLinkProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const presentation = getRoutineVideoPresentation(videoUrl);
  const showThumbnail = presentation.kind === 'youtube' && !thumbnailFailed;

  return (
    <div className="routine-video">
      <span className="routine-video__label">{messages.routineDetail.referenceVideo}</span>
      <a
        aria-label={messages.routineDetail.openVideo}
        className="routine-video-link"
        href={videoUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        {showThumbnail
          ? <>
              <img alt="" className="routine-video-link__thumbnail" onError={() => setThumbnailFailed(true)} src={presentation.thumbnailUrl} />
              <span aria-hidden="true" className="routine-video-link__play-overlay">
                <span className="routine-video-link__play-icon"><PlayTriangleIcon /></span>
              </span>
            </>
          : <span aria-hidden="true" className="routine-video-link__fallback"><PlayIcon /></span>}
      </a>
    </div>
  );
}

function PlayIcon() {
  return <svg fill="none" height="28" viewBox="0 0 24 24" width="28"><path d="m9 7 7 5-7 5V7Z" fill="currentColor" /><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

function PlayTriangleIcon() {
  return <svg height="16" viewBox="0 0 16 16" width="16"><path d="m5 3 8 5-8 5V3Z" fill="currentColor" /></svg>;
}
