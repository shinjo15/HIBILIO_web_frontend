import { Link } from 'react-router-dom';
import './accountRelationList.css';

export type AccountRelationListItem = {
  accountIdentifier: string;
  bio: string | null;
  name: string;
};

type AccountRelationListProps = {
  accounts: AccountRelationListItem[];
  className?: string;
};

export function AccountRelationList({ accounts, className }: AccountRelationListProps) {
  return (
    <div className={className} role="tabpanel">
      {accounts.map((account) => (
        <Link aria-label={account.name} className="account-relation-card" key={account.accountIdentifier} to={`/accounts/${account.accountIdentifier}`}>
          <span aria-hidden="true" className="account-relation-card__avatar">{account.name.charAt(0)}</span>
          <span className="account-relation-card__body">
            <strong className="account-relation-card__name">{account.name}</strong>
            {account.bio !== null && <span className="account-relation-card__bio">{account.bio}</span>}
          </span>
        </Link>
      ))}
    </div>
  );
}