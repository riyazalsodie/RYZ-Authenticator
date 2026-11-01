import React from 'react';
import { ViewMode, UserProfile } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faKey,
  faStar,
  faFolder,
  faGear,
  faLock,
  faRightFromBracket,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onLock: () => void;
  onLogout: () => void;
  accountCount: number;
  favoriteCount: number;
  currentUser?: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onLock,
  onLogout,
  accountCount,
  favoriteCount,
  currentUser,
}) => {
  const navItems = [
    { id: 'all' as ViewMode, label: 'All Accounts', icon: faKey, count: accountCount },
    { id: 'favorites' as ViewMode, label: 'Favorites', icon: faStar, count: favoriteCount },
    { id: 'groups' as ViewMode, label: 'Groups', icon: faFolder },
    { id: 'settings' as ViewMode, label: 'Settings', icon: faGear },
  ];

  return (
    <aside className="w-64 border-r border-white/5 bg-[#000000] flex flex-col justify-between p-4 h-full">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 px-2 py-1">
          <img
            src="/logo.png"
            alt="RYZ Auth"
            className="w-8 h-8 object-contain filter drop-shadow-[0_0_12px_rgba(0,255,136,0.45)]"
          />
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white">RYZ AUTH</h1>
            <p className="text-[10px] text-neutral-400 font-medium">No-Bloat Authenticator for PC</p>
          </div>
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00FF88]/10 text-[#00FF88] flex items-center justify-center text-xs shrink-0 border border-[#00FF88]/20">
              <FontAwesomeIcon icon={faUser} className="w-3.5 h-3.5" />
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser.username}</p>
              <p className="text-[10px] text-neutral-400 truncate">{currentUser.email}</p>
            </div>
          </div>
        )}

        {/* Navigation Items with Animated Sliding Indicator */}
        <nav className="relative p-1 bg-[#050806] border border-white/5 rounded-2xl flex flex-col box-border">
          {navItems.findIndex((i) => i.id === currentView) !== -1 && (
            <div
              className="absolute left-1 right-1 rounded-xl bg-[#00FF88]/15 border border-[#00FF88]/40 shadow-[0_0_20px_rgba(0,255,136,0.2)] transition-all duration-300 ease-out pointer-events-none z-0"
              style={{
                height: '40px',
                top: `calc(${navItems.findIndex((i) => i.id === currentView)} * 44px + 4px)`,
              }}
            />
          )}

          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className="relative z-10 w-full h-10 my-[2px] flex items-center justify-between px-3 rounded-xl text-xs font-medium focus:outline-none cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`w-3.5 h-3.5 transition-colors duration-200 ${
                      isActive ? 'text-[#00FF88]' : 'text-neutral-500'
                    }`}
                  />
                  <span
                    className={`transition-all duration-200 ${
                      isActive ? 'text-white font-bold scale-[1.02]' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors duration-200 ${
                      isActive
                        ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30 shadow-[0_0_8px_rgba(0,255,136,0.2)]'
                        : 'bg-white/5 text-neutral-500'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Lock & Logout Actions */}
      <div className="pt-3 border-t border-white/5 space-y-1">
        <button
          onClick={onLock}
          className="w-full flex items-center space-x-3 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-white/5 transition-colors"
        >
          <FontAwesomeIcon icon={faLock} className="w-3.5 h-3.5 text-neutral-500" />
          <span>Lock Vault</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
