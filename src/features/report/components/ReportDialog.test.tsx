import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReportDialog } from './ReportDialog';
import type { ReportService } from '../services/reportService';

afterEach(cleanup);

describe('ReportDialog', () => {
  it('理由と自由記述をアカウント通報として送信する', async () => {
    const user = userEvent.setup();
    const service: ReportService = { create: vi.fn().mockResolvedValue(undefined) };
    render(<ReportDialog onClose={vi.fn()} onUnauthorized={vi.fn()} open service={service} targetAccountIdentifier="account-1" />);

    await user.click(screen.getByRole('combobox', { name: '通報理由' }));
    await user.click(screen.getByRole('option', { name: 'なりすまし' }));
    await user.type(screen.getByRole('textbox', { name: '詳細（任意）' }), '本人ではないようです');
    await user.click(screen.getByRole('button', { name: '通報を送信' }));

    await waitFor(() => expect(service.create).toHaveBeenCalledWith({ category: 'impersonation', targetAccountIdentifier: 'account-1', text: '本人ではないようです' }));
    expect(await screen.findByRole('status')).toHaveTextContent('通報を受け付けました。ご協力ありがとうございます。');
  });

  it('投稿通報では投稿識別子も送信する', async () => {
    const user = userEvent.setup();
    const service: ReportService = { create: vi.fn().mockResolvedValue(undefined) };
    render(<ReportDialog onClose={vi.fn()} onUnauthorized={vi.fn()} open service={service} targetAccountIdentifier="account-1" targetPostIdentifier="post-1" />);

    await user.click(screen.getByRole('button', { name: '通報を送信' }));

    await waitFor(() => expect(service.create).toHaveBeenCalledWith({ category: 'spam', targetAccountIdentifier: 'account-1', targetPostIdentifier: 'post-1', text: '' }));
  });
});
