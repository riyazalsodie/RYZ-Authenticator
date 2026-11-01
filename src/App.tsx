import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ActiveAccount, VaultStatus, ViewMode, UserProfile, DEFAULT_GROUPS } from './types';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AccountCard } from './components/AccountCard';
import { AddAccountModal } from './components/AddAccountModal';
import { EditAccountModal } from './components/EditAccountModal';
import { AuthModal } from './components/AuthModal';
import { SettingsScreen } from './components/SettingsScreen';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faKey,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';
import { isMobile } from './utils/platform';

export const App: React.FC = () => {
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>({ exists: false, is_unlocked: false });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<ActiveAccount[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>('all');
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ActiveAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCreatedGroups, setUserCreatedGroups] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Consolidated set of all known groups (defaults + user created + accounts)
  const allKnownGroups = Array.from(
    new Set([
      ...DEFAULT_GROUPS,
      ...userCreatedGroups,
      ...accounts.map((a) => a.group_id).filter((g): g is string => !!g && g.trim().length > 0),
    ])
  );

  // Quick 1-click direct group assignment for AccountCard
  const handleAssignGroup = async (accountId: string, groupId: string | null) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    await invoke('edit_account', {
      id: acc.id,
      issuer: acc.issuer,
      label: acc.label,
      newSecret: null,
      algorithm: acc.algorithm,
      digits: acc.digits,
      period: acc.period,
      groupId: groupId || null,
    });
    await fetchCodes();
  };

  const handleCreateGroup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!allKnownGroups.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      setUserCreatedGroups((prev) => [...prev, trimmed]);
    }
    setSelectedGroupTab(trimmed);
    setNewGroupName('');
    setIsCreatingGroup(false);
  };

  // Poll vault status on mount
  const checkStatus = async () => {
    try {
      const status = await invoke<VaultStatus>('check_vault_status');
      setVaultStatus(status);
      if (status.user) {
        setCurrentUser(status.user);
      }
      if (status.is_unlocked) {
        await fetchCodes();
      } else {
        // Attempt DPAPI hardware-bound automatic login if session was remembered
        try {
          const autoProfile = await invoke<UserProfile | null>('try_auto_login');
          if (autoProfile) {
            setCurrentUser(autoProfile);
            setVaultStatus({ exists: true, is_unlocked: true, user: autoProfile });
            await fetchCodes();
          }
        } catch (e) {
          console.log('No persistent session found or device signature changed');
        }
      }
    } catch (err) {
      console.error('Failed to query vault status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCodes = async () => {
    try {
      const activeCodes = await invoke<ActiveAccount[]>('get_active_codes');
      setAccounts(activeCodes);
    } catch (err) {
      console.error('Failed to fetch active codes:', err);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // Synchronized 1-second interval to refresh OTP countdown and codes
  useEffect(() => {
    if (!vaultStatus.is_unlocked) return;

    const interval = setInterval(() => {
      fetchCodes();
    }, 1000);

    return () => clearInterval(interval);
  }, [vaultStatus.is_unlocked]);

  // Auth Handlers: Login & Register with PostgreSQL
  const handleLogin = async (identifier: string, pass: string, rememberMe: boolean) => {
    const profile = await invoke<UserProfile>('login_user', {
      identifier,
      password: pass,
      rememberMe,
    });
    setCurrentUser(profile);
    setVaultStatus({ exists: true, is_unlocked: true, user: profile });
    await fetchCodes();
  };

  const handleRegister = async (username: string, email: string, pass: string, rememberMe: boolean) => {
    const profile = await invoke<UserProfile>('register_user', {
      username,
      email,
      password: pass,
      rememberMe,
    });
    setCurrentUser(profile);
    setVaultStatus({ exists: true, is_unlocked: true, user: profile });
    await fetchCodes();
  };

  const handleUnlockWindowsHello = async () => {
    await invoke('unlock_with_windows_hello');
    setVaultStatus((prev) => ({ ...prev, exists: true, is_unlocked: true }));
    await fetchCodes();
  };

  const handleLock = async () => {
    await invoke('lock_vault');
    setVaultStatus((prev) => ({ ...prev, is_unlocked: false }));
    setAccounts([]);
  };

  const handleLogout = async () => {
    await invoke('logout_user');
    setCurrentUser(null);
    setVaultStatus({ exists: false, is_unlocked: false, user: null });
    setAccounts([]);
  };

  const handleResetVault = async () => {
    await invoke('reset_vault');
    setCurrentUser(null);
    setVaultStatus({ exists: false, is_unlocked: false, user: null });
    setAccounts([]);
  };

  const handleAddAccount = async (payload: {
    issuer: string;
    label: string;
    secret: string;
    algorithm: 'SHA1' | 'SHA256' | 'SHA512';
    digits: number;
    period: number;
    group?: string | null;
  }) => {
    await invoke('add_account', {
      issuer: payload.issuer,
      label: payload.label,
      secret: payload.secret,
      algorithm: payload.algorithm,
      digits: payload.digits,
      period: payload.period,
      isHotp: false,
      groupId: payload.group || null,
    });
    await fetchCodes();
  };

  const handleDeleteAccount = async (id: string) => {
    await invoke('delete_account', { id });
    await fetchCodes();
  };

  const handleEditAccount = async (payload: {
    id: string;
    issuer: string;
    label: string;
    new_secret?: string;
    algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
    digits?: number;
    period?: number;
    group_id?: string | null;
  }) => {
    await invoke('edit_account', {
      id: payload.id,
      issuer: payload.issuer,
      label: payload.label,
      newSecret: payload.new_secret || null,
      algorithm: payload.algorithm || null,
      digits: payload.digits || null,
      period: payload.period || null,
      groupId: payload.group_id !== undefined ? payload.group_id : null,
    });
    await fetchCodes();
  };

  const handleToggleFavorite = async (id: string) => {
    await invoke('toggle_favorite', { id });
    await fetchCodes();
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  };

  // Filter accounts based on search query and current view
  const filteredAccounts = accounts.filter((acc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      acc.issuer.toLowerCase().includes(q) ||
      acc.label.toLowerCase().includes(q) ||
      (acc.group_id && acc.group_id.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (currentView === 'favorites') {
      return acc.is_favorite;
    }

    return true;
  });

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#00FF88] border-t-transparent animate-spin"></div>
        </div>
      );
    }

    // 1. Auth Screen: Login with Username/Gmail + Pass or Create Account
    if (!vaultStatus.is_unlocked) {
      return (
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <AuthModal
            onLogin={handleLogin}
            onRegister={handleRegister}
            onUnlockWindowsHello={handleUnlockWindowsHello}
            onResetVault={handleResetVault}
            initialMode={vaultStatus.exists ? 'login' : 'register'}
          />
        </div>
      );
    }

    // 2. Unlocked Main Dashboard
    return (
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          onLock={handleLock}
          onLogout={handleLogout}
          accountCount={accounts.length}
          favoriteCount={accounts.filter((a) => a.is_favorite).length}
          currentUser={currentUser}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {currentView === 'settings' ? (
            <SettingsScreen />
          ) : currentView === 'groups' ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#000000]">
              {/* Header bar */}
              <div className="p-6 pb-4 border-b border-white/5 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center text-[#00FF88]">
                        <FontAwesomeIcon icon={faFolder} className="w-4 h-4" />
                      </div>
                      <h2 className="text-base font-bold text-white tracking-wide">ACCOUNT GROUPS & CATEGORIES</h2>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      Filter, organize, and 1-click assign your 2FA accounts by security domain.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsCreatingGroup(true)}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-all"
                    >
                      + Create Group
                    </button>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#00FF88] text-black font-semibold text-xs hover:bg-[#00E676] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,136,0.2)]"
                    >
                      <span>+ Add Account</span>
                    </button>
                  </div>
                </div>

                {/* Inline Quick Group Creator */}
                {isCreatingGroup && (
                  <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/5 border border-[#00FF88]/30 animate-in fade-in duration-200">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Enter new group name (e.g. Crypto, Gaming, Work)..."
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateGroup(newGroupName);
                        if (e.key === 'Escape') setIsCreatingGroup(false);
                      }}
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#00FF88]"
                    />
                    <button
                      onClick={() => handleCreateGroup(newGroupName)}
                      className="px-3 py-1.5 rounded-lg bg-[#00FF88] text-black text-xs font-bold hover:bg-[#00E676] active:scale-95 transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingGroup(false);
                        setNewGroupName('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-400 text-xs hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Group tabs selector - Toggle switch styled pill bar */}
                <div className="relative bg-white/5 border border-white/10 rounded-2xl p-1 flex items-center space-x-1 overflow-x-auto scrollbar-thin">
                  <button
                    onClick={() => setSelectedGroupTab('ALL')}
                    className={`relative px-3.5 py-1.5 rounded-xl text-xs shrink-0 transition-all duration-200 cursor-pointer ${
                      selectedGroupTab === 'ALL'
                        ? 'bg-[#00FF88] text-black font-bold shadow-[0_2px_15px_rgba(0,255,136,0.35)] scale-102'
                        : 'text-neutral-400 font-medium hover:text-white hover:bg-white/5'
                    }`}
                  >
                    All ({accounts.length})
                  </button>
                  <button
                    onClick={() => setSelectedGroupTab('UNTAGGED')}
                    className={`relative px-3.5 py-1.5 rounded-xl text-xs shrink-0 transition-all duration-200 cursor-pointer ${
                      selectedGroupTab === 'UNTAGGED'
                        ? 'bg-[#00FF88] text-black font-bold shadow-[0_2px_15px_rgba(0,255,136,0.35)] scale-102'
                        : 'text-neutral-400 font-medium hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Untagged ({accounts.filter((a) => !a.group_id).length})
                  </button>
                  {allKnownGroups.map((grp) => {
                    const count = accounts.filter(
                      (a) => a.group_id?.toLowerCase() === grp.toLowerCase()
                    ).length;
                    const isSelected = selectedGroupTab.toLowerCase() === grp.toLowerCase();
                    return (
                      <button
                        key={grp}
                        onClick={() => setSelectedGroupTab(grp)}
                        className={`relative px-3.5 py-1.5 rounded-xl text-xs shrink-0 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-[#00FF88] text-black font-bold shadow-[0_2px_15px_rgba(0,255,136,0.35)] scale-102'
                            : 'text-neutral-400 font-medium hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {grp} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group accounts list */}
              <main className="flex-1 overflow-y-auto p-6 space-y-3">
                {(() => {
                  const groupAccounts = accounts.filter((acc) => {
                    const q = searchQuery.toLowerCase();
                    const matchesSearch =
                      acc.issuer.toLowerCase().includes(q) ||
                      acc.label.toLowerCase().includes(q) ||
                      (acc.group_id && acc.group_id.toLowerCase().includes(q));
                    if (!matchesSearch) return false;

                    if (selectedGroupTab === 'ALL') return true;
                    if (selectedGroupTab === 'UNTAGGED') return !acc.group_id;
                    return acc.group_id?.toLowerCase() === selectedGroupTab.toLowerCase();
                  });

                  if (groupAccounts.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-neutral-500 mb-3">
                          <FontAwesomeIcon icon={faFolder} className="w-5 h-5 text-neutral-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-neutral-300">
                          {selectedGroupTab === 'UNTAGGED'
                            ? 'No untagged accounts'
                            : selectedGroupTab === 'ALL'
                            ? 'No accounts found'
                            : `No accounts in "${selectedGroupTab}"`}
                        </h3>
                        <p className="text-xs text-neutral-500 max-w-sm mt-1 mb-4">
                          {selectedGroupTab === 'ALL'
                            ? 'Add an account to get started.'
                            : `Use the "+ Group" button on any card or create a new account in "${selectedGroupTab}".`}
                        </p>
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-[#00FF88] text-black font-semibold text-xs hover:bg-[#00E676] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,136,0.25)]"
                        >
                          Add Account in {selectedGroupTab === 'ALL' || selectedGroupTab === 'UNTAGGED' ? 'Group' : selectedGroupTab}
                        </button>
                      </div>
                    );
                  }

                  return groupAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      availableGroups={allKnownGroups}
                      onAssignGroup={handleAssignGroup}
                      onToggleFavorite={handleToggleFavorite}
                      onEdit={(acc) => {
                        setEditingAccount(acc);
                        setIsEditModalOpen(true);
                      }}
                      onDelete={handleDeleteAccount}
                      onCopy={handleCopyCode}
                    />
                  ));
                })()}
              </main>
            </div>
          ) : (
            <>
              <Header
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />

              {/* Account Cards Container */}
              <main className="flex-1 overflow-y-auto p-6 space-y-3">
                {filteredAccounts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-neutral-500 mb-3">
                      <FontAwesomeIcon icon={faKey} className="w-5 h-5 text-neutral-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-300">No authenticator accounts found</h3>
                    <p className="text-xs text-neutral-500 max-w-sm mt-1 mb-4">
                      Add an account manually or scan a QR code screenshot. Records sync automatically to PostgreSQL.
                    </p>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#00FF88] text-black font-semibold text-xs hover:bg-[#00E676] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,136,0.25)]"
                    >
                      Add Your First Account
                    </button>
                  </div>
                ) : (
                  filteredAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      availableGroups={allKnownGroups}
                      onAssignGroup={handleAssignGroup}
                      onToggleFavorite={handleToggleFavorite}
                      onEdit={(acc) => {
                        setEditingAccount(acc);
                        setIsEditModalOpen(true);
                      }}
                      onDelete={handleDeleteAccount}
                      onCopy={handleCopyCode}
                    />
                  ))
                )}
              </main>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`h-screen w-screen select-none overflow-hidden m-0 p-0 ${isMobile() ? 'bg-[#000000]' : 'bg-transparent'}`}>
      <div className={`relative w-full h-full bg-[#000000] overflow-hidden flex flex-col ${
        isMobile()
          ? 'border-0 rounded-none shadow-none'
          : 'border border-[#00FF88]/20 rounded-2xl shadow-[0_0_50px_rgba(0,255,136,0.06)]'
      }`}>
        <TitleBar />
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {renderContent()}
        </div>

        {/* Add Account Modal */}
        <AddAccountModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddAccount={handleAddAccount}
          onAccountsImported={fetchCodes}
          availableGroups={allKnownGroups}
          defaultGroup={selectedGroupTab !== 'ALL' && selectedGroupTab !== 'UNTAGGED' ? selectedGroupTab : null}
        />

        {/* Edit Account Modal */}
        <EditAccountModal
          isOpen={isEditModalOpen}
          account={editingAccount}
          availableGroups={allKnownGroups}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingAccount(null);
          }}
          onUpdateAccount={handleEditAccount}
        />
      </div>
    </div>
  );
};
export default App;
