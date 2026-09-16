import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AccountAvatar } from './AccountImage';
import './accountRelationList.css';

export type AccountRelationListItem = {
  accountIdentifier: string;
  bio: string | null;
  iconImageUrl?: string | null;
  name: string;
};

type AccountRelationListProps = {
  action?: (account: AccountRelationListItem) => ReactNode;
  accounts: AccountRelationListItem[];
  className?: string;
};

export function AccountRelationList({ accounts, action, className }: AccountRelationListProps) {
  return (
    <div className={className} role="tabpanel">
      {accounts.map((account) => {
        const card = <Link aria-label={account.name} className="account-relation-card" key={account.accountIdentifier} to={`/accounts/${account.accountIdentifier}`}>
          <AccountAvatar className="account-relation-card__avatar" iconImageUrl={account.iconImageUrl ?? null} initial={account.name.charAt(0)} />
          <span className="account-relation-card__body">
            <strong className="account-relation-card__name">{account.name}</strong>
            {account.bio !== null && <span className="account-relation-card__bio">{account.bio}</span>}
          </span>
        </Link>;

        if (action === undefined) return card;

        return <div className="account-relation-card-with-action" key={account.accountIdentifier}>{card}<div className="account-relation-card-with-action__action">{action(account)}</div></div>;
      })}
    </div>
  );
}