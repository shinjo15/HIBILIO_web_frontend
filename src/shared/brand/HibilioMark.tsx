import { Box } from '@mui/material';

type HibilioMarkProps = {
  size?: number;
};

export function HibilioMark({ size = 28 }: HibilioMarkProps) {
  const gradientIdentifier = `hibilio-mark-${size}`;

  return (
    <Box aria-hidden="true" component="span" sx={{ display: 'inline-flex', lineHeight: 0 }}>
      <svg height={size} viewBox="0 0 1024 1024" width={size} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradientIdentifier} x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stopColor="#a84e1e" />
            <stop offset="100%" stopColor="#e07b3a" />
          </linearGradient>
        </defs>
        <circle cx="512" cy="512" fill="#f5efe8" r="512" />
        {[0, 90, 180, 270].map((rotation) => (
          <g key={rotation} transform={`rotate(${rotation} 512 512)`}>
            <rect fill={`url(#${gradientIdentifier})`} height="372" rx="10" width="20" x="502" y="140" />
            <path d="M 502 512 L 502 176 L 408 440 Z" fill={`url(#${gradientIdentifier})`} opacity="0.65" />
          </g>
        ))}
        <circle cx="512" cy="512" fill="#f5efe8" r="36" />
        <circle cx="512" cy="512" fill="#c2612a" r="16" />
      </svg>
    </Box>
  );
}
