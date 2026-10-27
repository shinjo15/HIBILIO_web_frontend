import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContactSupportPage } from './ContactSupportPage';
import { ContactSupportError, type ContactSupportService } from '../services/contactSupportService';

function renderPage(service: ContactSupportService) {
  return render(<MemoryRouter initialEntries={['/contact-support']}><ContactSupportPage service={service} /><Location /></MemoryRouter>);
}

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

afterEach(cleanup);

describe('ContactSupportPage', () => {
  it('ルーティン作成画面と同じヘッダー・フィールド構造で表示する', () => {
    renderPage({ create: vi.fn() });

    const back = screen.getByRole('link', { name: 'アカウントに戻る' });
    const header = back.closest('header');
    expect(header).toHaveClass('contact-support__header');
    expect(header).toContainElement(screen.getByRole('heading', { name: 'お問い合わせ' }));
    expect(header?.querySelector('.contact-support__header-spacer')).toBeInTheDocument();
    expect(screen.getByLabelText('件名').closest('.contact-support__field')).toBeInTheDocument();
    expect(screen.getByLabelText('内容').closest('.contact-support__field')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送信する' })).toHaveClass('contact-support__submit');
  });

  it('アカウント画面へ戻る操作を提供する', async () => {
    const user = userEvent.setup();
    renderPage({ create: vi.fn() });

    await user.click(screen.getByRole('link', { name: 'アカウントに戻る' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/account');
  });

  it('お問い合わせフォームを表示し、成功時は完了状態を表示する', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(undefined);
    renderPage({ create });

    await user.type(screen.getByLabelText('件名'), 'お問い合わせ件名');
    await user.type(screen.getByLabelText('内容'), 'お問い合わせ内容');
    await user.click(screen.getByRole('button', { name: '送信する' }));

    expect(create).toHaveBeenCalledWith({ content: 'お問い合わせ内容', title: 'お問い合わせ件名' });
    expect(await screen.findByRole('status')).toHaveTextContent('お問い合わせを受け付けました。');
  });

  it.each([
    ['件名が空白のみ', '   ', '内容', '件名を入力してください。'],
    ['件名が50文字を超える', 'a'.repeat(51), '内容', '件名は50文字以内で入力してください。'],
    ['内容が空白のみ', '件名', '   ', '内容を入力してください。'],
    ['内容が500文字を超える', '件名', 'a'.repeat(501), '内容は500文字以内で入力してください。'],
  ])('%s場合は送信せず入力エラーを表示する', async (_caseName, title, content, error) => {
    const user = userEvent.setup();
    const create = vi.fn();
    renderPage({ create });

    await user.type(screen.getByLabelText('件名'), title);
    if (content.length > 100) {
      fireEvent.change(screen.getByLabelText('内容'), { target: { value: content } });
    } else {
      await user.type(screen.getByLabelText('内容'), content);
    }
    await user.click(screen.getByRole('button', { name: '送信する' }));

    expect(await screen.findByText(error)).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('422のフィールドエラーを表示し、入力値を保持する', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockRejectedValue(new ContactSupportError('validation failed', 422, { content: ['内容を確認してください。'] }));
    renderPage({ create });

    await user.type(screen.getByLabelText('件名'), 'お問い合わせ件名');
    await user.type(screen.getByLabelText('内容'), 'お問い合わせ内容');
    await user.click(screen.getByRole('button', { name: '送信する' }));

    expect(await screen.findByText('内容を確認してください。')).toBeInTheDocument();
    expect(screen.getByLabelText('件名')).toHaveValue('お問い合わせ件名');
    expect(screen.getByLabelText('内容')).toHaveValue('お問い合わせ内容');
  });

  it.each([
    [401, 'ログイン状態を確認してから、もう一度お試しください。'],
    [429, '送信回数が上限に達しました。時間をおいてからお試しください。'],
    [500, 'お問い合わせを送信できませんでした。時間をおいて再試行してください。'],
    [undefined, 'ネットワークに接続できませんでした。通信環境を確認して再試行してください。'],
  ])('送信失敗 %s は入力値を保持して案内を表示する', async (status, error) => {
    const user = userEvent.setup();
    const create = vi.fn().mockRejectedValue(new ContactSupportError('failed', status));
    renderPage({ create });

    await user.type(screen.getByLabelText('件名'), 'お問い合わせ件名');
    await user.type(screen.getByLabelText('内容'), 'お問い合わせ内容');
    await user.click(screen.getByRole('button', { name: '送信する' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(error);
    expect(screen.getByLabelText('件名')).toHaveValue('お問い合わせ件名');
    expect(screen.getByLabelText('内容')).toHaveValue('お問い合わせ内容');
  });

  it('送信中は二重送信しない', async () => {
    const user = userEvent.setup();
    let resolveCreate: () => void = () => {};
    const create = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveCreate = resolve; }));
    renderPage({ create });

    await user.type(screen.getByLabelText('件名'), 'お問い合わせ件名');
    await user.type(screen.getByLabelText('内容'), 'お問い合わせ内容');
    const submit = screen.getByRole('button', { name: '送信する' });
    await user.click(submit);
    fireEvent.submit(submit.closest('form') as HTMLFormElement);

    expect(create).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    resolveCreate();
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });
});
