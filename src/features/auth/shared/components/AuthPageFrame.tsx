import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { HibilioMark } from '../../../../shared/brand/HibilioMark';
import messages from '../../../../shared/message/message.json';

type AuthPageFrameProps = {
  children: ReactNode;
  description: string;
  errorMessage: string | null;
  title: string;
};

export function AuthPageFrame({ children, description, errorMessage, title }: AuthPageFrameProps) {
  return (
    <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100dvh', px: 3, py: 5 }}>
      <Box sx={{ maxWidth: 384, width: '100%' }}>
        <Stack spacing={1.25} sx={{ alignItems: 'center', mb: 5 }}>
          <HibilioMark size={40} />
          <Typography component="p" sx={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600, letterSpacing: '0.04em' }}>
            {messages.app.name}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>
            {messages.app.tagline}
          </Typography>
        </Stack>
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
          <Typography component="h1" variant="h6">
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14, mt: 1 }}>
            {description}
          </Typography>
          {errorMessage !== null && <Alert severity="error" sx={{ mt: 2 }}>{errorMessage}</Alert>}
          <Box sx={{ mt: 3 }}>{children}</Box>
        </Paper>
      </Box>
    </Box>
  );
}

export function AuthTextField(props: React.ComponentProps<typeof TextField>) {
  return <TextField fullWidth size="medium" {...props} />;
}

export function AuthSubmitButton(props: React.ComponentProps<typeof Button>) {
  return <Button fullWidth size="large" variant="contained" {...props} />;
}
