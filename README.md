# HIBILIO Web Frontend

## Development

Node.js 22（CIと同じmajor）を使用する。

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

## API origin / Cloudflare Pages

- Pagesのプロジェクトルートはこのリポジトリのルート。
- Build command: `npm run build`
- Build output directory: `dist`
- Build environment: `NODE_VERSION=22`、`VITE_API_ORIGIN=https://api.hibilio.com`
- `VITE_API_ORIGIN` はビルド時に埋め込まれる。PagesのProduction環境へ設定し、変更後は再ビルド・再デプロイする。Preview環境は別途設定する（本番APIを使う場合は本番データへアクセスする点に注意）。
- `.env.example` は設定例。未設定または空なら従来どおり `/api/...` の相対URLを使う。開発時の `/api` と `/auth/social` はVite proxyから `http://localhost:8001` へ転送する。proxyは開発専用であり、Pagesやビルド成果物には存在しない。
- originはHTTP(S)のschemeとhost（必要ならport）のみ。末尾 `/` は許容するが、`/api` などのpath、query、fragment、認証情報や空白は不可。不正値は通信前にエラーとする。本番はHTTPSを指定する。
- 全API呼び出しは `src/shared/api/apiFetch.ts` を通す。`credentials: 'include'` を既定とし、明示的な指定は保持する。これにより従来same-originで暗黙に送られていたGETの認証CookieもAPI originへ送れる。Googleログインは同じURL helperによる `/auth/social/google` へのブラウザ遷移。画像・外部リンクのURLは変更しない。
- `VITE_` 変数はJavaScriptへ埋め込まれ、誰でも閲覧できる。秘密鍵、OAuth client secret、API token、password等は絶対に設定しない。`VITE_API_ORIGIN` は公開URLであり、認証情報ではない。

### Cookie / CSRFとデプロイ後の確認

`https://hibilio.com` → `https://api.hibilio.com` はcross-originだがHTTPS同士のsame-site。APIのhost-only HttpOnly Cookieはフロントから読み取る必要がない。既存の `GET /api/csrf-token` を `credentials: 'include'` で呼び、APIセッションのCookieをブラウザに保存させ、JSONの `csrf_token` を更新リクエストの `X-CSRF-TOKEN` へ付与する。`document.cookie` / `XSRF-TOKEN` Cookieの読み取りへは変更しない。パスコード認証・永続ログイン復元・logoutの順序やエラー処理も保持する。

バックエンドはフロントの正確なoriginに対するcredentialed CORSと、`Content-Type` / `X-CSRF-TOKEN` のpreflight許可が必要。ローカルのbackend設定は `https://hibilio.com` を許可し、credentialsを有効にしている。`*.pages.dev` のPreviewはcross-siteであり、CORS許可だけではSameSite=Lax Cookieによるログインは動かない。Production相当の認証確認には同じsiteのHTTPSドメインを使う。本変更はbackend・Cookie設定・インフラを変更しない。

自動テストはURL、credentials、CSRF JSON→header、既存の応答・エラー処理を検証するが、実ブラウザによるCookie/CORS/OAuthの確認の代替ではない。デプロイ後はNetworkでCSRF応答のSet-Cookie、次の更新リクエストのCookieとCSRF header、認証後GET、復元・logoutの結果を確認する。OAuthの本番provider credentials・callback URL・frontendへの戻り先設定は別途確認が必要で、この変更では検証済みとはしない。
