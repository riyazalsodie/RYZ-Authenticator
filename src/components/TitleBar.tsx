import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMinus,
  faSquare,
  faClone,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleDrag = async (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      try {
        await invoke('drag_window');
      } catch (err) {
        console.error('Drag error:', err);
      }
    }
  };

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('minimize_window');
    } catch (err) {
      console.error('Minimize error:', err);
    }
  };

  const handleToggleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const max = await invoke<boolean>('toggle_maximize_window');
      setIsMaximized(max);
    } catch (err) {
      console.error('Maximize error:', err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('close_window');
    } catch (err) {
      console.error('Close error:', err);
    }
  };

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleDrag}
      className={`h-10 bg-[#000000] border-b border-[#00FF88]/15 flex items-center justify-between select-none z-50 text-neutral-300 cursor-move shrink-0 px-2.5 ${
        isMobile ? 'rounded-none' : 'rounded-t-2xl'
      }`}
    >
      {/* macOS Traffic Lights (if on Mac) */}
      {isMac && !isMobile && (
        <div
          className="flex items-center space-x-2 pl-1 pr-3"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-[#FF5F56] hover:brightness-110 active:brightness-90 transition-all border border-[#E0443E]/50"
            title="Close"
          />
          <button
            type="button"
            onClick={handleMinimize}
            className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-110 active:brightness-90 transition-all border border-[#DEA123]/50"
            title="Minimize"
          />
          <button
            type="button"
            onClick={handleToggleMaximize}
            className="w-3 h-3 rounded-full bg-[#27C93F] hover:brightness-110 active:brightness-90 transition-all border border-[#1AAB29]/50"
            title={isMaximized ? 'Restore' : 'Maximize'}
          />
        </div>
      )}

      {/* Brand title and drag area */}
      <div
        data-tauri-drag-region
        onMouseDown={handleDrag}
        className="flex items-center space-x-2.5 px-2 flex-1 h-full pointer-events-auto cursor-move"
      >
        <img
          src="/logo.png"
          alt="RYZ"
          className="w-5 h-5 object-contain filter drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]"
        />
        <span className="text-xs font-extrabold text-white tracking-wider flex items-center space-x-1.5">
          <span>RYZ AUTH</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] inline-block shadow-[0_0_8px_#00FF88]" />
        </span>
        <span className="text-[10px] text-neutral-400 font-medium hidden sm:inline">
          — Multi-Platform Authenticator
        </span>
      </div>

      {/* Windows & Linux Native-style Control Buttons (hidden on Mac and Mobile) */}
      {!isMac && !isMobile && (
        <div
          className="flex items-center h-full space-x-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleMinimize}
            className="h-7 w-9 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center cursor-pointer pointer-events-auto"
            title="Minimize"
          >
            <FontAwesomeIcon icon={faMinus} className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleToggleMaximize}
            className="h-7 w-9 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center cursor-pointer pointer-events-auto"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <FontAwesomeIcon icon={isMaximized ? faClone : faSquare} className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="h-7 w-9 rounded-md text-neutral-400 hover:text-white hover:bg-red-600 active:bg-red-700 transition-all flex items-center justify-center cursor-pointer pointer-events-auto"
            title="Close"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
