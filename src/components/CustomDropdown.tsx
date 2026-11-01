import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons';

export interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
  sublabel?: string;
}

interface CustomDropdownProps<T extends string | number> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
  direction?: 'up' | 'down';
}

export function CustomDropdown<T extends string | number>({
  value,
  options,
  onChange,
  className = '',
  size = 'md',
  direction = 'down',
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-[#060907] border rounded-xl text-neutral-200 transition-all duration-200 focus:outline-none ${
          isOpen
            ? 'border-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.18)] text-white'
            : 'border-white/10 hover:border-[#00FF88]/40 hover:bg-[#0A0F0C]'
        } ${size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'}`}
      >
        <span className="font-medium truncate">{selectedOption?.label}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-[10px] text-neutral-400 transition-transform duration-200 shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180 text-[#00FF88]' : ''
          }`}
        />
      </button>

      {/* Modern Glassmorphic Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 py-1.5 bg-[#030604] border border-[#00FF88]/25 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.98)] backdrop-blur-xl animate-fade-in ${
            direction === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                  isSelected
                    ? 'bg-[#00FF88]/15 text-[#00FF88] font-semibold'
                    : 'text-neutral-300 hover:bg-[#00FF88]/10 hover:text-white'
                }`}
              >
                <div>
                  <div>{opt.label}</div>
                  {opt.sublabel && (
                    <div className="text-[10px] text-neutral-500">{opt.sublabel}</div>
                  )}
                </div>
                {isSelected && (
                  <FontAwesomeIcon icon={faCheck} className="text-xs text-[#00FF88] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
