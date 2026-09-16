import { useEffect, useState } from 'react';
import messages from '../../../shared/message/message.json';
import './feedAdvertisement.css';

const adsenseClient = import.meta.env.VITE_ADSENSE_CLIENT;
const adsenseFeedSlot = import.meta.env.VITE_ADSENSE_FEED_SLOT;

export function FeedAdvertisement() {
  const [failed, setFailed] = useState(false);
  const enabled = adsenseClient !== undefined && adsenseClient !== '' && adsenseFeedSlot !== undefined && adsenseFeedSlot !== '';

  useEffect(() => {
    if (!enabled || failed) return;

    const existingScript = document.querySelector<HTMLScriptElement>(`script[data-adsense-client="${adsenseClient}"]`);
    const script = existingScript ?? document.createElement('script');
    if (existingScript === null) {
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.adsenseClient = adsenseClient;
      script.onerror = () => setFailed(true);
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`;
      document.head.append(script);
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      queueMicrotask(() => setFailed(true));
    }
  }, [enabled, failed]);

  if (!enabled || failed) return null;

  return <aside aria-label={messages.routineFeed.advertisement} className="routine-feed-advertisement"><span className="routine-feed-advertisement__label">{messages.routineFeed.advertisement}</span><ins className="adsbygoogle" data-ad-client={adsenseClient} data-ad-format="auto" data-ad-slot={adsenseFeedSlot} data-full-width-responsive="true" /></aside>;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}
