import React from 'react';
import { ViewMode, UserProfile } from '../types';
import { getAppTagline, isMobile } from '../utils/platform';
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
  onSync?: () => void;
  isSyncing?: boolean;
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
    { id: 'all' as ViewMode, label: 'All Accounts', shortLabel: 'Accounts', icon: faKey, count: accountCount },
    { id: 'favorites' as ViewMode, label: 'Favorites', shortLabel: 'Favorites', icon: faStar, count: favoriteCount },
    { id: 'groups' as ViewMode, label: 'Groups', shortLabel: 'Groups', icon: faFolder },
    { id: 'settings' as ViewMode, label: 'Settings', shortLabel: 'Settings', icon: faGear },
  ];

  const activeIndex = Math.max(0, navItems.findIndex((i) => i.id === currentView));
  const mobileMode = isMobile();

  return (
    <>
      {/* Desktop Left Sidebar (hidden on mobile and small viewports) */}
      {!mobileMode && (
        <aside className="hidden md:flex w-64 border-r border-white/5 bg-[#000000] flex-col justify-between p-4 h-full shrink-0">
          <div className="space-y-5">
            {/* Brand Header */}
            <div className="flex items-center space-x-3 px-2 py-1">
              <img
                src="/logo.png"
                alt="RYZ Auth"
                className="w-8 h-8 object-contain filter drop-shadow-[0_0_12px_rgba(0,255,136,0.45)]"
              />
              <div>
                <h1 className="text-sm font-bold tracking-wider text-white">RYZ AUTH</h1>
                <p className="text-[10px] text-neutral-400 font-medium">{getAppTagline()}</p>
              </div>
            </div>

            {/* User Card */}
            {currentUser && (
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#00FF88]/10 text-[#00FF88] flex items-center justify-center text-xs shrink-0 border border-[#00FF88]/20">
                    <FontAwesomeIcon icon={faUser} className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{currentUser.username}</p>
                    <p className="text-[10px] text-neutral-400 truncate">{currentUser.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Items with Animated Sliding Indicator */}
            <nav className="relative p-1 bg-[#050806] border border-white/5 rounded-2xl flex flex-col box-border">
              <div
                className="absolute left-1 right-1 rounded-xl bg-[#00FF88]/15 border border-[#00FF88]/40 shadow-[0_0_20px_rgba(0,255,136,0.2)] transition-all duration-300 ease-out pointer-events-none z-0"
                style={{
                  height: '40px',
                  top: `calc(${activeIndex} * 44px + 4px)`,
                }}
              />

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
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faLock} className="w-3.5 h-3.5 text-neutral-500" />
              <span>Lock Vault</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* Mobile & Compact Bottom Navigation Bar */}
      <nav
        className={`${
          mobileMode ? 'flex' : 'flex md:hidden'
        } fixed bottom-0 left-0 right-0 z-40 bg-[#030604]/95 backdrop-blur-xl border-t border-[#00FF88]/20 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-10px_30px_rgba(0,0,0,0.85)]`}
      >
        <div className="relative w-full grid grid-cols-4 gap-1 p-1 bg-[#060A08] border border-white/5 rounded-2xl">
          {/* Animated Sliding Horizontal Pill Indicator */}
          <div
            className="absolute top-1 bottom-1 rounded-xl bg-[#00FF88]/15 border border-[#00FF88]/40 shadow-[0_0_15px_rgba(0,255,136,0.25)] transition-all duration-300 ease-out pointer-events-none z-0"
            style={{
              width: 'calc(25% - 4px)',
              left: `calc(${activeIndex * 25}% + 2px)`,
            }}
          />

          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className="relative z-10 flex flex-col items-center justify-center py-2 px-1 rounded-xl focus:outline-none cursor-pointer"
              >
                <div className="relative flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`w-4 h-4 transition-colors duration-200 ${
                      isActive ? 'text-[#00FF88]' : 'text-neutral-500'
                    }`}
                  />
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-3.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight ${
                        isActive
                          ? 'bg-[#00FF88] text-black shadow-[0_0_8px_rgba(0,255,136,0.5)]'
                          : 'bg-white/10 text-neutral-300'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
                <span
                  className={`mt-1 text-[10px] tracking-wide transition-all duration-200 ${
                    isActive ? 'text-[#00FF88] font-bold' : 'text-neutral-400 font-medium'
                  }`}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
