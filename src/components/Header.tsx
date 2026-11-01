import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faPlus,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
}) => {
  const handleDrag = async (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      try {
        await invoke('drag_window');
      } catch (err) {
        // Ignore
      }
    }
  };

  return (
    <header
      data-tauri-drag-region
      onMouseDown={handleDrag}
      className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-[#000000] cursor-default select-none"
    >
      {/* Search Input */}
      <div
        className="relative flex-1 max-w-md"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <FontAwesomeIcon icon={faMagnifyingGlass} className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search accounts, tags, issuers..."
          className="w-full pl-9 pr-4 py-2 bg-[#050806] border border-white/10 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#00FF88] focus:ring-1 focus:ring-[#00FF88] transition-all"
        />
      </div>

      {/* Action Buttons */}
      <div
        className="flex items-center space-x-3"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/30 text-[10px] font-semibold text-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.15)]">
          <FontAwesomeIcon icon={faShieldHalved} className="w-3 h-3 text-[#00FF88]" />
          <span>Vault Secured</span>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#00FF88] text-black font-semibold text-xs hover:bg-[#00E676] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,136,0.25)]"
        >
          <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 text-black" />
          <span>Add Account</span>
        </button>
      </div>
    </header>
  );
};
