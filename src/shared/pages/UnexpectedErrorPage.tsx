import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import { Button } from '@mui/material';
import messages from '../message/message.json';
import { UnexpectedErrorContent } from './UnexpectedErrorContent';

export function UnexpectedErrorPage() {
  return (
    <UnexpectedErrorContent
      renderRetry={(className) => <Button className={className} component="a" href={window.location.href} size="large" variant="contained">{messages.unexpectedError.retry}</Button>}
      renderHomeLink={(className) => <Button className={className} component="a" href="/home" size="large" startIcon={<HomeOutlinedIcon />} variant="outlined">Homeへ戻る</Button>}
    />
  );
}
