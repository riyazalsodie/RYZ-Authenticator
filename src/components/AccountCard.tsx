import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCopy,
  faCheck,
  faStar,
  faTrash,
  faPen,
} from '@fortawesome/free-solid-svg-icons';
import { ActiveAccount } from '../types';
import { CountdownRing } from './CountdownRing';
import { BrandIcon } from './BrandIcon';

interface AccountCardProps {
  account: ActiveAccount;
  availableGroups?: string[];
  onAssignGroup?: (id: string, group: string | null) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (account: ActiveAccount) => void;
  onDelete: (id: string) => void;
  onCopy: (code: string) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  availableGroups = [],
  onAssignGroup,
  onToggleFavorite,
  onEdit,
  onDelete,
  onCopy,
}) => {
  const [copied, setCopied] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const handleCopy = () => {
    onCopy(account.current_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format code into 3-3 or 4-4 groups
  const formattedCode =
    account.digits === 6
      ? `${account.current_code.slice(0, 3)} ${account.current_code.slice(3)}`
      : `${account.current_code.slice(0, 4)} ${account.current_code.slice(4)}`;

  return (
    <div className="group relative flex items-center justify-between p-4 rounded-xl bg-[#030604] border border-white/5 hover:border-[#00FF88]/25 hover:shadow-[0_0_25px_rgba(0,255,136,0.08)] transition-all duration-200">
      <div className="flex items-center space-x-4">
        {/* Account Brand Icon */}
        <div className="w-10 h-10 rounded-xl bg-[#060A07] border border-[#00FF88]/20 flex items-center justify-center p-2 shadow-inner shadow-[#00FF88]/10 group-hover:scale-105 group-hover:border-[#00FF88]/40 transition-all shrink-0">
          <BrandIcon name={account.issuer || account.label} size={22} className="w-5 h-5" />
        </div>

        {/* Account Meta */}
        <div>
          <div className="flex items-center space-x-2 relative">
            <span className="font-semibold text-sm text-neutral-100 group-hover:text-white transition-colors">{account.issuer || 'Unnamed'}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20">
              {account.algorithm}
            </span>
            {account.group_id ? (
              <button
                type="button"
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                className="text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-md bg-[#00FF88]/10 text-emerald-300 border border-[#00FF88]/20 hover:border-[#00FF88]/60 hover:bg-[#00FF88]/20 transition-all cursor-pointer"
                title="Click to change or remove group"
              >
                📁 {account.group_id}
              </button>
            ) : onAssignGroup ? (
              <button
                type="button"
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                className="text-[10px] font-medium tracking-wide px-1.5 py-0.5 rounded-md bg-white/5 text-neutral-400 border border-white/10 hover:border-[#00FF88]/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Quick assign group"
              >
                + Group
              </button>
            ) : null}

            {/* Quick Group Menu Popover */}
            {showGroupMenu && onAssignGroup && (
              <div className="absolute top-6 left-24 z-50 w-40 bg-[#080D0A] border border-[#00FF88]/30 rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.8)] p-1.5 space-y-1 animate-fade-in">
                <p className="text-[10px] font-bold text-neutral-400 px-2 py-1 uppercase tracking-wider">
                  Move to Group:
                </p>
                {availableGroups.map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => {
                      onAssignGroup(account.id, grp);
                      setShowGroupMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      account.group_id?.toLowerCase() === grp.toLowerCase()
                        ? 'bg-[#00FF88]/20 text-[#00FF88] font-bold'
                        : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{grp}</span>
                    {account.group_id?.toLowerCase() === grp.toLowerCase() && <span>✓</span>}
                  </button>
                ))}
                {account.group_id && (
                  <button
                    type="button"
                    onClick={() => {
                      onAssignGroup(account.id, null);
                      setShowGroupMenu(false);
                    }}
                    className="w-full text-left px-2 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5 mt-1"
                  >
                    Remove from Group
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-400 truncate max-w-[200px] sm:max-w-[260px]">{account.label}</p>
        </div>
      </div>

      {/* Code Display & Action Center */}
      <div className="flex items-center space-x-5">
        <button
          onClick={handleCopy}
          className="flex items-center space-x-3 px-3 py-1.5 rounded-xl hover:bg-[#00FF88]/10 transition-colors focus:outline-none focus:ring-1 focus:ring-[#00FF88]"
          title="Click to copy code"
        >
          <span className="code-font text-2xl font-bold tracking-widest text-neutral-100 group-hover:text-[#00FF88] transition-colors">
            {formattedCode}
          </span>
          <div className="text-neutral-500 hover:text-[#00FF88] transition-colors">
            {copied ? (
              <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-[#00FF88] animate-scale" />
            ) : (
              <FontAwesomeIcon icon={faCopy} className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </button>

        {/* Countdown Ring Timer */}
        <CountdownRing
          remainingSeconds={account.remaining_seconds}
          period={account.period}
          size={32}
        />

        {/* Actions Menu */}
        <div className="flex items-center space-x-1 pl-2 border-l border-white/5">
          <button
            onClick={() => onToggleFavorite(account.id)}
            className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${
              account.is_favorite ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Toggle favorite"
          >
            <FontAwesomeIcon icon={faStar} className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEdit(account)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-[#00FF88] hover:bg-[#00FF88]/10 transition-colors opacity-0 group-hover:opacity-100"
            title="Edit account details"
          >
            <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(account.id)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete account"
          >
            <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
