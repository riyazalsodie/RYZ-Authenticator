import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faPlus,
  faLock,
  faXmark,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { UserProfile } from '../types';
import { isMobile } from '../utils/platform';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
  onSync?: () => void;
  onLock?: () => void;
  isSyncing?: boolean;
  currentUser?: UserProfile | null;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onLock,
  currentUser,
}) => {
  const handleDrag = async (e: React.MouseEvent) => {
    if (!isMobile() && e.buttons === 1) {
      try {
        await invoke('drag_window');
      } catch (err) {
        // Ignore
      }
    }
  };

  const mobileMode = isMobile();

  return (
    <header
      data-tauri-drag-region={!mobileMode ? true : undefined}
      onMouseDown={handleDrag}
      className="border-b border-white/5 bg-[#000000] select-none shrink-0"
    >
      {/* Mobile / Narrow Top Bar (shown on mobile or < md screens) */}
      <div
        className={`${
          mobileMode ? 'flex' : 'flex md:hidden'
        } flex-col px-4 pt-[max(env(safe-area-inset-top),2.25rem)] pb-3 space-y-3`}
      >
        <div className="flex items-center justify-between">
          {/* Brand + Active User Pill */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="RYZ Auth"
              className="w-7 h-7 object-contain filter drop-shadow-[0_0_10px_rgba(0,255,136,0.5)] shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-extrabold text-white tracking-wider">RYZ AUTH</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_8px_#00FF88]" />
              </div>
              {currentUser ? (
                <div className="flex items-center space-x-1 text-[10px] text-neutral-400 truncate">
                  <FontAwesomeIcon icon={faUser} className="w-2.5 h-2.5 text-[#00FF88]" />
                  <span className="truncate font-medium text-neutral-300">{currentUser.username}</span>
                </div>
              ) : (
                <p className="text-[10px] text-neutral-400">Encrypted 2FA Vault</p>
              )}
            </div>
          </div>

          {/* Mobile Quick Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            {onLock && (
              <button
                type="button"
                onClick={onLock}
                title="Lock Vault"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                <FontAwesomeIcon icon={faLock} className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center space-x-1.5 px-3.5 h-9 rounded-xl bg-[#00FF88] text-black font-bold text-xs hover:bg-[#00E676] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,136,0.3)] cursor-pointer"
            >
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 text-black" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Full-Width Mobile Search Bar */}
        <div className="relative w-full">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search accounts, tags, issuers..."
            className="w-full pl-9 pr-8 py-2.5 bg-[#050806] border border-white/10 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#00FF88] focus:ring-1 focus:ring-[#00FF88] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1"
            >
              <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Header Bar */}
      {!mobileMode && (
        <div className="hidden md:flex h-16 px-6 items-center justify-between">
          {/* Search Input */}
          <div
            className="relative flex-1 max-w-md"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search accounts, tags, issuers..."
              className="w-full pl-9 pr-8 py-2 bg-[#050806] border border-white/10 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#00FF88] focus:ring-1 focus:ring-[#00FF88] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1"
              >
                <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div
            className="flex items-center space-x-2.5 ml-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={onOpenAddModal}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#00FF88] text-black font-semibold text-xs hover:bg-[#00E676] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,136,0.25)] cursor-pointer"
            >
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 text-black" />
              <span>Add Account</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
