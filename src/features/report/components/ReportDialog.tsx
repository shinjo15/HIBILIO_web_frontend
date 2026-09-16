import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { useState } from 'react';
import messages from '../../../shared/message/message.json';
import { reportCategories, reportService, ReportUnauthorizedError, type ReportCategory, type ReportService } from '../services/reportService';
import './reportDialog.css';

type ReportDialogProps = {
  onClose: () => void;
  onUnauthorized: () => void;
  open: boolean;
  service?: ReportService;
  targetAccountIdentifier: string;
  targetPostIdentifier?: string;
};

export function ReportDialog({ onClose, onUnauthorized, open, service = reportService, targetAccountIdentifier, targetPostIdentifier }: ReportDialogProps) {
  const [category, setCategory] = useState<ReportCategory>('spam');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const reportTarget = targetPostIdentifier === undefined ? messages.report.account : messages.report.post;

  function close() {
    if (submitting) return;
    setCategory('spam');
    setError(null);
    setSubmitted(false);
    setText('');
    onClose();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await service.create({ category, targetAccountIdentifier, ...(targetPostIdentifier === undefined ? {} : { targetPostIdentifier }), text });
      setSubmitted(true);
    } catch (caughtError) {
      if (caughtError instanceof ReportUnauthorizedError) {
        onUnauthorized();
        return;
      }
      setError(caughtError instanceof Error && caughtError.message !== '' ? caughtError.message : messages.report.error);
    } finally {
      setSubmitting(false);
    }
  }

  return <Dialog aria-labelledby="report-dialog-title" fullWidth maxWidth="xs" onClose={close} open={open}><DialogTitle id="report-dialog-title">{messages.report.title.replace('{target}', reportTarget)}</DialogTitle><DialogContent><form id="report-form" onSubmit={(event) => void submit(event)}>{submitted ? <p className="report-dialog__success" role="status">{messages.report.success}</p> : <><p className="report-dialog__description">{messages.report.description}</p><FormControl fullWidth margin="normal"><InputLabel id="report-category-label">{messages.report.category}</InputLabel><Select label={messages.report.category} labelId="report-category-label" onChange={(event) => setCategory(event.target.value as ReportCategory)} value={category}>{reportCategories.map((value) => <MenuItem key={value} value={value}>{messages.report.categories[value]}</MenuItem>)}</Select></FormControl><TextField fullWidth helperText={messages.report.textHint.replace('{count}', String(500 - text.length))} label={messages.report.text} margin="normal" multiline minRows={4} onChange={(event) => setText(event.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} value={text} />{error !== null && <p className="report-dialog__error" role="alert">{error === 'Failed to create report' ? messages.report.error : error}</p>}</>}</form></DialogContent><DialogActions>{submitted ? <Button onClick={close} variant="contained">{messages.report.close}</Button> : <><Button disabled={submitting} onClick={close}>{messages.report.cancel}</Button><Button disabled={submitting} form="report-form" type="submit" variant="contained">{submitting ? messages.report.submitting : messages.report.submit}</Button></>}</DialogActions></Dialog>;
}
