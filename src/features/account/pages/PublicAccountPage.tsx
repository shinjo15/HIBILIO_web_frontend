import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { accountService as defaultCurrentAccountService, AccountUnauthorizedError, type AccountService } from '../services/accountService';
import { publicAccountService, type PublicAccountService } from '../services/publicAccountService';

import { AccountPage } from './AccountPage';
import { accountBlockService, type AccountBlockService } from '../services/accountBlockService';
import { accountFollowService, type AccountFollowService } from '../services/accountFollowService';
import messages from '../../../shared/message/message.json';

type PublicAccountPageProps = { blockService?: AccountBlockService; currentAccountService?: Pick<AccountService, 'getProfile'>; followService?: AccountFollowService; service?: PublicAccountService };

export function PublicAccountPage({ blockService = accountBlockService, currentAccountService = defaultCurrentAccountService, followService = accountFollowService, service = publicAccountService }: PublicAccountPageProps) {
  const navigate = useNavigate();
  const { accountId = '' } = useParams<{ accountId: string }>();
  const accountService = useMemo<AccountService>(() => ({
    getExecutionHistory: async () => null,
    getProfile: async () => service.get(accountId),
    listExecutionHistories: async () => service.listExecutionHistories(accountId),
    listExecutionHistoriesPage: service.listExecutionHistoriesPage === undefined ? undefined : async (page) => service.listExecutionHistoriesPage?.(accountId, page) ?? { items: [], total: 0 },
    listBlockedAccounts: async () => [],

    listLikes: async () => service.listLikes(accountId),
    listLikesPage: service.listLikesPage === undefined ? undefined : async (page) => service.listLikesPage?.(accountId, page) ?? { items: [], total: 0 },
    listPosts: async () => service.listPosts(accountId),
    listPostsPage: service.listPostsPage === undefined ? undefined : async (page) => service.listPostsPage?.(accountId, page) ?? { items: [], total: 0 },
  }), [accountId, service]);
  const [currentAccountIdentifier, setCurrentAccountIdentifier] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    currentAccountService.getProfile().then((profile) => {
      if (!cancelled) setCurrentAccountIdentifier(profile?.accountIdentifier ?? null);
    }).catch((error: unknown) => {
      if (!cancelled && error instanceof AccountUnauthorizedError) setCurrentAccountIdentifier(null);
    });
    return () => { cancelled = true; };
  }, [currentAccountService]);

  return <AccountPage blockService={blockService} followService={followService} isOwnAccount={false} notFoundMessage={messages.publicAccount.notFound} onBack={() => navigate(-1)} service={accountService} showPublicActions={currentAccountIdentifier !== undefined && currentAccountIdentifier !== accountId} />;
}
