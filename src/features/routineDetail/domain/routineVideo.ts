const youtubeVideoIdentifierPattern = /^[A-Za-z0-9_-]{11}$/;

export type RoutineVideoPresentation =
  | { kind: 'fallback' }
  | { kind: 'youtube'; thumbnailUrl: string };

export function isHttpVideoUrl(value: string): boolean {
  if (value.length > 2048 || /[\s\p{C}<>"{}|\\^`]|%(?![0-9a-fA-F]{2})/u.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:')
      && hasValidBrowserNumericHost(getRawHost(value));
  } catch {
    return false;
  }
}

function getRawHost(value: string): string {
  const authority = value.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/iu)?.[1] ?? '';
  const hostAndPort = authority.slice(authority.lastIndexOf('@') + 1);
  if (hostAndPort.startsWith('[')) {
    return hostAndPort.slice(0, hostAndPort.indexOf(']') + 1);
  }

  return hostAndPort.split(':')[0];
}

function hasValidBrowserNumericHost(host: string): boolean {
  const parts = host.split('.');
  if (parts.at(-1) === '' && parts.length > 1) {
    parts.pop();
  }
  const last = parts.at(-1);
  if (last === undefined || !/^(?:[0-9]+|0[xX][0-9a-fA-F]*)$/.test(last)) {
    return true;
  }
  if (parts.length > 4) {
    return false;
  }

  return parts.every((part, index) => {
    const number = parseBrowserIpv4Number(part);
    if (number === null) {
      return false;
    }
    const isLast = index === parts.length - 1;
    return isLast ? number < 256 ** (4 - index) : number <= 255;
  });
}

function parseBrowserIpv4Number(part: string): number | null {
  let base = 10;
  if (part.slice(0, 2).toLowerCase() === '0x') {
    base = 16;
    part = part.slice(2);
  } else if (part.length >= 2 && part.startsWith('0')) {
    base = 8;
    part = part.slice(1);
  }
  if (part !== '' && !(base === 16 ? /^[0-9a-f]+$/i : base === 8 ? /^[0-7]+$/ : /^\d+$/).test(part)) {
    return null;
  }

  let number = 0;
  for (const digit of part) {
    number = number * base + Number.parseInt(digit, 16);
    if (number > 4_294_967_295) {
      return null;
    }
  }
  return number;
}

export function getRoutineVideoPresentation(videoUrl: string): RoutineVideoPresentation {
  const videoIdentifier = getYouTubeVideoIdentifier(videoUrl);

  return videoIdentifier === null
    ? { kind: 'fallback' }
    : { kind: 'youtube', thumbnailUrl: `https://i.ytimg.com/vi/${videoIdentifier}/hqdefault.jpg` };
}

function getYouTubeVideoIdentifier(videoUrl: string): string | null {
  try {
    const url = new URL(videoUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    let videoIdentifier: string | null = null;

    if (hostname === 'youtu.be') {
      videoIdentifier = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        videoIdentifier = url.searchParams.get('v');
      } else {
        const [section, identifier] = url.pathname.split('/').filter(Boolean);
        if (section === 'embed' || section === 'shorts' || section === 'live') {
          videoIdentifier = identifier ?? null;
        }
      }
    }

    return videoIdentifier !== null && youtubeVideoIdentifierPattern.test(videoIdentifier)
      ? videoIdentifier
      : null;
  } catch {
    return null;
  }
}
