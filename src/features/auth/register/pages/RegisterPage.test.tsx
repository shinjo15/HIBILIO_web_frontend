import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';

function csrfAwareFetch(status = 204) {
  return vi.fn((path: string) => {
    if (path === '/api/csrf-token') return Promise.resolve(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }));
    if (path === '/api/tags/pickup') return Promise.resolve(new Response(JSON.stringify({
      tags: [{ tag_identifier: '20000000-0000-4000-8000-000000000001', tag_name: '朝活' }],
    }), { status: 200 }));
    return Promise.resolve(new Response(null, { status }));
  });
}

beforeEach(() => vi.stubGlobal('fetch', csrfAwareFetch()));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RegisterPage', () => {
  it('メールアドレス入力からモック準拠のパスコード確認画面へ進む', async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'アカウントを作成' })).toBeInTheDocument();
    expect(screen.getByText(/ステップ 1／5\s+メールアドレスを入力/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'パスコードを送信' })).toBeDisabled();

    await user.type(screen.getByLabelText('メールアドレス'), 'new-member@example.com');
    await user.click(screen.getByRole('button', { name: 'パスコードを送信' }));

    expect(await screen.findByRole('heading', { name: 'パスコードを確認' })).toBeInTheDocument();
    expect(screen.getByText(/ステップ 2／5\s+メールを確認してください/)).toBeInTheDocument();
    expect(screen.getByText('new-member@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('パスコード 1桁目')).toBeInTheDocument();
  });

  it('プロフィール設定の確定時にbackend契約のアカウント作成payloadだけを送信する', async () => {
    const user = userEvent.setup();
    const fetchMock = csrfAwareFetch(201);
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await user.type(screen.getByLabelText('メールアドレス'), 'new-member@example.com');
    await user.click(screen.getByRole('button', { name: 'パスコードを送信' }));
    await user.type(screen.getByLabelText('パスコード 1桁目'), '123456');
    await user.click(screen.getByRole('button', { name: '確認して次へ' }));

    expect(await screen.findByRole('heading', { name: 'プロフィール設定' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('アカウント名'), '山田 由紀');
    await user.type(screen.getByLabelText('ユーザーID（@ハンドル）'), 'yuki_sleep');
    await user.type(screen.getByLabelText('自己紹介'), '朝のルーティンを続けています。');
    await user.click(screen.getByRole('button', { name: '次へ' }));
    await user.click(await screen.findByRole('button', { name: '次へ' }));
    await user.click(await screen.findByRole('button', { name: 'HIBILIOをはじめる' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/registration-passcodes', expect.objectContaining({
      body: JSON.stringify({ email_address: 'new-member@example.com' }),
      method: 'POST',
    }));
    expect(fetchMock).toHaveBeenCalledWith('/api/registration-passcodes/verification', expect.objectContaining({
      body: JSON.stringify({ passcode: '123456' }),
      method: 'POST',
    }));
    expect(fetchMock).toHaveBeenCalledWith('/api/accounts', expect.objectContaining({
      body: JSON.stringify({
        account_bio: '朝のルーティンを続けています。',
        account_name: '山田 由紀',
        favorite_tag_identifiers: [],
        social_links: [],
      }),
      method: 'POST',
    }));
  });

  it('ソーシャルリンクを追加してアカウント作成payloadへ送信する', async () => {
    const user = userEvent.setup();
    const fetchMock = csrfAwareFetch(201);
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await user.type(screen.getByLabelText('メールアドレス'), 'new-member@example.com');
    await user.click(screen.getByRole('button', { name: 'パスコードを送信' }));
    await user.type(screen.getByLabelText('パスコード 1桁目'), '123456');
    await user.click(screen.getByRole('button', { name: '確認して次へ' }));
    await user.type(screen.getByLabelText('アカウント名'), '山田 由紀');
    await user.type(screen.getByLabelText('ユーザーID（@ハンドル）'), 'yuki_sleep');
    await user.click(screen.getByRole('button', { name: '次へ' }));

    expect(await screen.findByRole('heading', { name: 'ソーシャルリンク' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'X (Twitter)' }));
    await user.type(screen.getByLabelText('X (Twitter)のリンク'), 'hibilio');
    await user.click(screen.getByRole('button', { name: '追加' }));
    await user.click(screen.getByRole('button', { name: '次へ' }));
    await user.click(await screen.findByRole('button', { name: 'HIBILIOをはじめる' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/accounts', expect.objectContaining({
      body: JSON.stringify({
        account_bio: null,
        account_name: '山田 由紀',
        favorite_tag_identifiers: [],
        social_links: [{ social_type: 'x', social_url: 'https://x.com/hibilio' }],
      }),
      method: 'POST',
    }));
  });

  it('選択したサービスのアイコン付き入力欄を表示し、追加したリンクを表示する', async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await user.type(screen.getByLabelText('メールアドレス'), 'new-member@example.com');
    await user.click(screen.getByRole('button', { name: 'パスコードを送信' }));
    await user.type(screen.getByLabelText('パスコード 1桁目'), '123456');
    await user.click(screen.getByRole('button', { name: '確認して次へ' }));
    await user.type(screen.getByLabelText('アカウント名'), '山田 由紀');
    await user.type(screen.getByLabelText('ユーザーID（@ハンドル）'), 'yuki_sleep');
    await user.click(screen.getByRole('button', { name: '次へ' }));

    await user.click(screen.getByRole('button', { name: 'YouTube' }));

    expect(screen.getByLabelText('YouTubeのリンク')).toHaveAttribute('placeholder', 'チャンネル名');
    expect(document.querySelector('.hibilio-register__social-input .hibilio-register__social-icon--youtube')).toBeInTheDocument();

    await user.type(screen.getByLabelText('YouTubeのリンク'), 'hibilio_channel');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(screen.getByRole('heading', { name: '追加したリンク' })).toBeInTheDocument();
    expect(screen.getByText('hibilio_channel')).toBeInTheDocument();
    expect(document.querySelector('.hibilio-register__social-link .hibilio-register__social-icon--youtube')).toBeInTheDocument();
  });

  it('選択したダミータグのidentifierをアカウント作成payloadへ送信する', async () => {
    const user = userEvent.setup();
    const fetchMock = csrfAwareFetch(201);
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await user.type(screen.getByLabelText('メールアドレス'), 'new-member@example.com');
    await user.click(screen.getByRole('button', { name: 'パスコードを送信' }));
    await user.type(screen.getByLabelText('パスコード 1桁目'), '123456');
    await user.click(screen.getByRole('button', { name: '確認して次へ' }));
    await user.type(screen.getByLabelText('アカウント名'), '山田 由紀');
    await user.type(screen.getByLabelText('ユーザーID（@ハンドル）'), 'yuki_sleep');
    await user.click(screen.getByRole('button', { name: '次へ' }));
    await user.click(screen.getByRole('button', { name: '次へ' }));

    expect(await screen.findByRole('heading', { name: '好きなジャンルを選ぶ' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '朝活' }));
    await user.click(screen.getByRole('button', { name: 'HIBILIOをはじめる' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/accounts', expect.objectContaining({
      body: expect.stringContaining('"favorite_tag_identifiers":["20000000-0000-4000-8000-000000000001"]'),
      method: 'POST',
    }));
  });
});
