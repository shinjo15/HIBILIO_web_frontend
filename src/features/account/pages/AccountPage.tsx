import { Box, Paper, Typography } from '@mui/material';
import messages from '../../../shared/message/message.json';

export function AccountPage() {
  return (
    <Box sx={{ margin: '0 auto', maxWidth: 760, p: 3 }}>
      <Typography component="h1" variant="h4">
        {messages.account.title}
      </Typography>
      <Paper sx={{ mt: 3, p: 3 }} variant="outlined">
        <Typography color="text.secondary">
          {messages.account.placeholder}
        </Typography>
      </Paper>
    </Box>
  );
}
