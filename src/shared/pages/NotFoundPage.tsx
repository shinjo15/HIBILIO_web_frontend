import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import messages from '../message/message.json';
import { notFoundMotion } from './notFoundMotion';

export function NotFoundPage() {
  return (
    <Box
      aria-labelledby="not-found-page-title"
      component="section"
      sx={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100dvh',
        px: { sm: 6, xs: 3 },
        py: { sm: 10, xs: 6 },
        position: 'relative',
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          '@keyframes hibilio-not-found-icon-float': notFoundMotion.float.keyframes,
          '@keyframes hibilio-not-found-icon-spin': notFoundMotion.spin.keyframes,
          maxWidth: 560,
          px: { sm: 3, xs: 1 },
          width: '100%',
        }}
      >
        <Box
          data-testid="not-found-icon-float"
          sx={{
            animation: notFoundMotion.float.animation,
            '@media (prefers-reduced-motion: reduce)': notFoundMotion.reduce,
            mb: 2.5,
          }}
        >
          <Box
            aria-hidden="true"
            component="img"
            data-testid="not-found-icon-spin"
            sx={{
              animation: notFoundMotion.spin.animation,
              display: 'block',
              height: { sm: 108, xs: 92 },
              margin: '0 auto',
              '@media (prefers-reduced-motion: reduce)': notFoundMotion.reduce,
              width: { sm: 108, xs: 92 },
            }}
            src="/favicon.svg"
          />
        </Box>
        <Typography component="p" sx={{ color: 'var(--hibilio-color-primary)', fontSize: { sm: 80, xs: 64 }, fontWeight: 700, letterSpacing: '-0.06em', lineHeight: 0.95, mb: 3 }}>
          {messages.notFound.code}
        </Typography>
        <Typography component="h1" id="not-found-page-title" sx={{ color: 'var(--hibilio-color-on-background)', fontSize: { sm: 34, xs: 28 }, fontWeight: 700, lineHeight: 1.3, mb: 3 }}>
          {messages.notFound.title}
        </Typography>
        <Typography color="text.primary" sx={{ fontSize: { sm: 17, xs: 16 }, fontWeight: 600, lineHeight: 1.7, mb: 0.5 }}>
          {messages.notFound.description}
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: { sm: 15, xs: 14 }, lineHeight: 1.7, mb: 3 }}>
          {messages.notFound.friendlyNote}
        </Typography>
        <Button component={RouterLink} size="large" startIcon={<HomeOutlinedIcon />} to="/home" variant="contained">
          {messages.notFound.backToHome}
        </Button>
      </Box>
    </Box>
  );
}
