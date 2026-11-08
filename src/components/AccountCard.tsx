import React, { useState, useRef, useMemo, useEffect } from 'react';
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

interface ShatterParticle {
  id: number;
  left: string;
  top: string;
  size: number;
  tx: string;
  ty: string;
  rot: string;
  delay: string;
  color: string;
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
  const [copyPhase, setCopyPhase] = useState<'idle' | 'in' | 'out'>('idle');
  const [copyKey, setCopyKey] = useState(0);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHoldingDelete, setIsHoldingDelete] = useState(false);
  const [holdRemainingSec, setHoldRemainingSec] = useState<number>(6);
  const [showHoldHint, setShowHoldHint] = useState(false);

  const outTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdCompletedRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (outTimerRef.current) clearTimeout(outTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (deleteHoldTimerRef.current) clearTimeout(deleteHoldTimerRef.current);
      if (holdCountdownIntervalRef.current) clearInterval(holdCountdownIntervalRef.current);
      if (holdHintTimerRef.current) clearTimeout(holdHintTimerRef.current);
    };
  }, []);

  // Pre-generate 44 Telegram-style shatter particles for when the card is deleted
  const shatterParticles = useMemo<ShatterParticle[]>(() => {
    const colors = ['#00FF88', '#10B981', '#34D399', '#A7F3D0', '#F87171', '#FFFFFF'];
    return Array.from({ length: 44 }, (_, idx) => {
      const col = idx % 11;
      const row = Math.floor(idx / 11);
      const left = `${6 + col * 8.5 + ((idx * 7) % 5)}%`;
      const top = `${14 + row * 22 + ((idx * 13) % 9)}%`;
      const angle = ((idx * 47) % 360) * (Math.PI / 180);
      const dist = 28 + ((idx * 19) % 58);
      const tx = `${Math.round(Math.cos(angle) * dist)}px`;
      const ty = `${Math.round(Math.sin(angle) * dist - 18)}px`;
      const rot = `${((idx * 83) % 320) - 160}deg`;
      const size = 3 + (idx % 4);
      const delay = `${(idx % 6) * 0.018}s`;
      const color = colors[idx % colors.length];
      return { id: idx, left, top, size, tx, ty, rot, delay, color };
    });
  }, []);

  const handleCopy = () => {
    onCopy(account.current_code);
    if (outTimerRef.current) clearTimeout(outTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    setCopyKey((prev) => prev + 1);
    setCopyPhase('in');

    outTimerRef.current = setTimeout(() => {
      setCopyPhase('out');
    }, 1350);

    idleTimerRef.current = setTimeout(() => {
      setCopyPhase('idle');
    }, 1600);
  };

  const DELETE_HOLD_DURATION_MS = 6000;

  const startDeleteHold = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    holdCompletedRef.current = false;
    setIsHoldingDelete(true);
    setHoldRemainingSec(6);
    setShowHoldHint(false);
    if (deleteHoldTimerRef.current) clearTimeout(deleteHoldTimerRef.current);
    if (holdCountdownIntervalRef.current) clearInterval(holdCountdownIntervalRef.current);

    const startTime = Date.now();
    holdCountdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rem = Math.max(1, Math.ceil((DELETE_HOLD_DURATION_MS - elapsed) / 1000));
      setHoldRemainingSec(rem);
    }, 150);

    deleteHoldTimerRef.current = setTimeout(() => {
      holdCompletedRef.current = true;
      if (holdCountdownIntervalRef.current) {
        clearInterval(holdCountdownIntervalRef.current);
        holdCountdownIntervalRef.current = null;
      }
      setIsHoldingDelete(false);
      setIsDeleting(true);
      setTimeout(() => {
        onDelete(account.id);
      }, 480);
    }, DELETE_HOLD_DURATION_MS);
  };

  const endDeleteHold = (e: React.MouseEvent | React.TouchEvent, showHintOnShortTap = true) => {
    e.stopPropagation();
    if (deleteHoldTimerRef.current) {
      clearTimeout(deleteHoldTimerRef.current);
      deleteHoldTimerRef.current = null;
    }
    if (holdCountdownIntervalRef.current) {
      clearInterval(holdCountdownIntervalRef.current);
      holdCountdownIntervalRef.current = null;
    }
    if (isHoldingDelete && !holdCompletedRef.current && showHintOnShortTap) {
      setShowHoldHint(true);
      if (holdHintTimerRef.current) clearTimeout(holdHintTimerRef.current);
      holdHintTimerRef.current = setTimeout(() => {
        setShowHoldHint(false);
      }, 2000);
    }
    setIsHoldingDelete(false);
  };

  // Format code into 3-3 or 4-4 groups
  const formattedCode =
    account.digits === 6
      ? `${account.current_code.slice(0, 3)} ${account.current_code.slice(3)}`
      : `${account.current_code.slice(0, 4)} ${account.current_code.slice(4)}`;

  return (
    <div
      className={`group relative flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 gap-3 sm:gap-4 ${
        copyPhase === 'in'
          ? 'bg-[#040D07] border-[#00FF88]/40 shadow-[0_0_25px_rgba(0,255,136,0.12)]'
          : 'bg-[#030604] border-white/10 hover:border-[#00FF88]/30 hover:shadow-[0_0_25px_rgba(0,255,136,0.08)]'
      } ${isDeleting ? 'animate-telegram-vanish overflow-visible' : ''}`}
    >
      {/* Telegram-Style Shattered Particle Burst Overlay when Deleting */}
      {isDeleting && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-visible">
          {shatterParticles.map((p) => (
            <span
              key={p.id}
              className="absolute rounded-sm animate-telegram-shard"
              style={
                {
                  left: p.left,
                  top: p.top,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  boxShadow: `0 0 8px ${p.color}`,
                  animationDelay: p.delay,
                  '--tx': p.tx,
                  '--ty': p.ty,
                  '--rot': p.rot,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* Top Row on Mobile / Left Side on Desktop: Brand Icon + Account Info + Mobile Action Icons */}
      <div className="flex items-start sm:items-center justify-between sm:justify-start gap-3 min-w-0 flex-1">
        <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1">
          {/* Account Brand Icon */}
          <div className="w-10 h-10 rounded-xl bg-[#060A07] border border-[#00FF88]/20 flex items-center justify-center p-2 shadow-inner shadow-[#00FF88]/10 group-hover:scale-105 group-hover:border-[#00FF88]/40 transition-all shrink-0">
            <BrandIcon name={account.issuer || account.label} size={22} className="w-5 h-5" />
          </div>

          {/* Account Meta */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 relative">
              <span className="font-bold text-sm text-neutral-100 group-hover:text-white transition-colors truncate max-w-[160px] sm:max-w-[220px]">
                {account.issuer || 'Unnamed'}
              </span>
              {account.group_id && (
                <button
                  type="button"
                  onClick={() => setShowGroupMenu(!showGroupMenu)}
                  className="text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-md bg-[#00FF88]/10 text-emerald-300 border border-[#00FF88]/20 hover:border-[#00FF88]/60 hover:bg-[#00FF88]/20 transition-all cursor-pointer shrink-0"
                  title="Click to change or remove group"
                >
                  📁 {account.group_id}
                </button>
              )}

              {/* Quick Group Menu Popover */}
              {showGroupMenu && onAssignGroup && (
                <div className="absolute top-7 left-0 z-50 w-44 bg-[#080D0A] border border-[#00FF88]/30 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.9)] p-1.5 space-y-1 animate-fade-in">
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
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
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
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5 mt-1"
                    >
                      Remove from Group
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-neutral-400 truncate mt-0.5">{account.label}</p>
          </div>
        </div>

        {/* Mobile-Only Quick Action Buttons (Always visible on mobile touchscreens) */}
        <div className="flex sm:hidden items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleFavorite(account.id)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center active:scale-95 transition-colors ${
              account.is_favorite ? 'text-amber-400 bg-amber-400/10' : 'text-neutral-500 hover:text-neutral-300 bg-white/[0.03]'
            }`}
            title="Toggle favorite"
          >
            <FontAwesomeIcon icon={faStar} className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(account)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-[#00FF88] bg-white/[0.03] active:scale-95 transition-colors"
            title="Edit account"
          >
            <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            {(showHoldHint || isHoldingDelete) && (
              <span className="absolute -top-7 right-0 whitespace-nowrap px-2 py-0.5 rounded-md bg-red-950/90 border border-red-500/40 text-[9px] font-bold text-red-300 shadow-lg pointer-events-none z-50 animate-fade-in">
                {isHoldingDelete ? `Hold ${holdRemainingSec}s to delete` : 'Hold 6s to delete'}
              </span>
            )}
            <button
              type="button"
              onMouseDown={startDeleteHold}
              onMouseUp={(e) => endDeleteHold(e, true)}
              onMouseLeave={(e) => endDeleteHold(e, false)}
              onTouchStart={startDeleteHold}
              onTouchEnd={(e) => endDeleteHold(e, true)}
              onTouchCancel={(e) => endDeleteHold(e, false)}
              onContextMenu={(e) => e.preventDefault()}
              className={`relative overflow-hidden w-8 h-8 rounded-lg flex items-center justify-center transition-all select-none ${
                isHoldingDelete
                  ? 'text-red-300 bg-red-500/20 scale-110 border border-red-500/50'
                  : 'text-neutral-400 hover:text-red-400 bg-white/[0.03]'
              }`}
              title="Hold 6 seconds to delete account"
            >
              {isHoldingDelete && (
                <span className="absolute inset-x-0 bottom-0 bg-red-500/40 animate-[holdFill_6s_linear_forwards]" style={{ height: '100%' }} />
              )}
              <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5 relative z-10" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row on Mobile / Right Side on Desktop: Code Display + Countdown + Desktop Actions */}
      <div
        className={`flex items-center justify-between sm:justify-end sm:space-x-4 sm:bg-transparent border sm:border-0 rounded-xl px-3.5 py-2 sm:p-0 shrink-0 transition-all duration-200 select-none ${
          copyPhase === 'in'
            ? 'bg-[#00FF88]/15 border-[#00FF88]/45 shadow-[0_0_18px_rgba(0,255,136,0.15)] sm:shadow-none'
            : 'bg-[#060B08] border-[#16261C]'
        }`}
      >
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center space-x-3 sm:px-3 sm:py-1.5 rounded-xl transition-all duration-200 outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] select-none cursor-pointer flex-1 sm:flex-initial justify-between sm:justify-start ${
            copyPhase === 'in'
              ? 'sm:bg-[#00FF88]/15 sm:shadow-[0_0_15px_rgba(0,255,136,0.12)]'
              : 'sm:hover:bg-[#00FF88]/10 active:bg-[#00FF88]/20'
          }`}
          title="Tap to copy 2FA code"
        >
          <span className="code-font text-2xl font-extrabold tracking-[0.2em] text-[#00FF88] transition-colors select-none">
            {formattedCode}
          </span>
          <div className="flex items-center space-x-1.5 text-[#00FF88] transition-colors pr-2 sm:pr-0 min-w-[64px] justify-end select-none">
            {copyPhase !== 'idle' ? (
              <span
                key={copyKey}
                className={`inline-flex items-center space-x-1 text-[11px] font-bold text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.45)] ${
                  copyPhase === 'in' ? 'animate-copy-in' : 'animate-copy-out'
                }`}
              >
                <FontAwesomeIcon
                  icon={faCheck}
                  className="w-3 h-3 text-[#00FF88] animate-tick-pop"
                />
                <span>Copied</span>
              </span>
            ) : (
              <FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </button>

        {/* Countdown Ring Timer */}
        <CountdownRing
          remainingSeconds={account.remaining_seconds}
          period={account.period}
          size={32}
        />

        {/* Desktop Actions Menu */}
        <div className="hidden sm:flex items-center space-x-1 pl-2 border-l border-white/5">
          <button
            type="button"
            onClick={() => onToggleFavorite(account.id)}
            className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${
              account.is_favorite ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Toggle favorite"
          >
            <FontAwesomeIcon icon={faStar} className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(account)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-[#00FF88] hover:bg-[#00FF88]/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Edit account details"
          >
            <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            {(showHoldHint || isHoldingDelete) && (
              <span className="absolute -top-7 right-0 whitespace-nowrap px-2 py-0.5 rounded-md bg-red-950/90 border border-red-500/40 text-[9px] font-bold text-red-300 shadow-lg pointer-events-none z-50 animate-fade-in">
                {isHoldingDelete ? `Hold ${holdRemainingSec}s to delete` : 'Hold 6s to delete'}
              </span>
            )}
            <button
              type="button"
              onMouseDown={startDeleteHold}
              onMouseUp={(e) => endDeleteHold(e, true)}
              onMouseLeave={(e) => endDeleteHold(e, false)}
              onTouchStart={startDeleteHold}
              onTouchEnd={(e) => endDeleteHold(e, true)}
              onTouchCancel={(e) => endDeleteHold(e, false)}
              onContextMenu={(e) => e.preventDefault()}
              className={`relative overflow-hidden p-1.5 rounded-lg transition-all cursor-pointer select-none ${
                isHoldingDelete
                  ? 'text-red-300 bg-red-500/20 scale-110 opacity-100 border border-red-500/50'
                  : 'text-neutral-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100'
              }`}
              title="Hold 6 seconds to delete account"
            >
              {isHoldingDelete && (
                <span className="absolute inset-x-0 bottom-0 bg-red-500/40 animate-[holdFill_6s_linear_forwards]" style={{ height: '100%' }} />
              )}
              <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5 relative z-10" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
