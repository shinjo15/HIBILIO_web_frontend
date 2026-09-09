import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AccountService } from '../services/accountService';
import { publicAccountService, type PublicAccountService } from '../services/publicAccountService';
import { AccountPage } from './AccountPage';
import messages from '../../../shared/message/message.json';

type PublicAccountPageProps = { service?: PublicAccountService };

export function PublicAccountPage({ service = publicAccountService }: PublicAccountPageProps) {
  const navigate = useNavigate();
  const { accountId = '' } = useParams<{ accountId: string }>();
  const accountService = useMemo<AccountService>(() => ({
    getExecutionHistory: async () => null,
    getProfile: async () => service.get(accountId),
    listExecutionHistories: async () => service.listExecutionHistories(accountId),
    listLikes: async () => service.listLikes(accountId),
    listPosts: async () => service.listPosts(accountId),
  }), [accountId, service]);

  return <AccountPage isOwnAccount={false} notFoundMessage={messages.publicAccount.notFound} onBack={() => navigate(-1)} service={accountService} />;
}
