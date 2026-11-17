export const notFoundMotion = {
  float: {
    animation: 'hibilio-not-found-icon-float 2.4s ease-in-out infinite',
    keyframes: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-10px)' },
    },
  },
  reduce: { animation: 'none' },
  spin: {
    animation: 'hibilio-not-found-icon-spin 1.4s linear infinite',
    keyframes: {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(-360deg)' },
    },
  },
} as const;
