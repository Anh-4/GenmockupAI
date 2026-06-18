import React, { useState, useEffect, useRef } from 'react';

export function useOnClickOutside(ref: React.RefObject<HTMLElement | null>, handler: (e: MouseEvent | TouchEvent) => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center px-2 mb-1">
    <span className="text-[11px] font-medium text-[rgba(218,220,224,0.6)] tracking-[0.05em] uppercase">
      {children}
    </span>
  </div>
);

export const PillButton: React.FC<{
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'filled' | 'outline' | 'solid';
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}> = ({ icon, children, variant = 'filled', onClick, disabled }) => {
  const base = 'flex items-center gap-[6px] justify-center w-full h-[38px] rounded-2xl font-medium tracking-[0.1px] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    filled: 'bg-white/10 hover:bg-white/20 text-white text-[12px] px-4 select-none',
    outline: 'border border-white/20 hover:bg-white/5 backdrop-blur-md text-[12px] px-4 text-white select-none',
    solid: 'bg-white hover:bg-gray-100 active:bg-gray-200 text-black text-[12px] px-4 select-none shadow-lg',
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      {icon && <span className="flex items-center justify-center w-5 h-5">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export const FieldDisplay: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = '' }) => (
  <div className={`border border-white/10 bg-white/[0.02] rounded-2xl flex flex-col gap-0.5 justify-center pb-2.5 pl-3.5 pr-2 pt-[7px] select-none ${className}`}>
    <p className="text-[10px] font-medium text-white/30 tracking-[0.1px] uppercase">{label}</p>
    <div className="flex items-center">
      <span className="text-[12px] font-medium text-white/80 tracking-[0.1px]">{value}</span>
    </div>
  </div>
);

export const TextInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="border border-white/10 hover:border-white/20 focus:border-white/30 rounded-2xl w-full h-[70px] px-4 py-3 resize-none bg-white/[0.02] text-[12px] font-medium text-white placeholder-white/20 tracking-[0.1px] focus:outline-none transition-all dark-scrollbar"
  />
);

export const SegmentedToggle: React.FC<{
  value: string;
  items: { value: string; label: string; icon?: React.ReactNode }[];
  onChange: (val: string) => void;
}> = ({ value, items, onChange }) => (
  <div className="flex w-full items-center border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02] p-1">
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        onClick={() => onChange(item.value)}
        className={`flex-1 flex items-center justify-center gap-1.5 h-[30px] rounded-xl text-[11px] font-medium tracking-[0.1px] transition-all cursor-pointer ${
          value === item.value ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
        }`}
      >
        {item.icon}<span>{item.label}</span>
      </button>
    ))}
  </div>
);

export const FieldDropdown: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  className?: string;
  openUp?: boolean;
}> = ({ label, value, options, onChange, className = '', openUp = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setIsOpen(false));

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left border border-white/10 hover:border-white/20 bg-white/[0.02] transition-all rounded-2xl flex flex-col gap-0.5 justify-center pb-2.5 pl-3.5 pr-2 pt-[7px] select-none focus:outline-none"
      >
        {label && <p className="text-[10px] font-medium text-white/30 tracking-[0.1px] uppercase">{label}</p>}
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-white/80 tracking-[0.1px]">{value}</span>
          <span className={`material-symbols-outlined text-[18px] text-white/20 transition-transform ${isOpen ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
        </div>
      </button>
      {isOpen && (
        <div className={`absolute z-50 left-0 w-full bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl animate-dropdown ${openUp ? 'bottom-[calc(100%+4px)] origin-bottom' : 'top-[calc(100%+4px)] origin-top'}`}>
          <div className="max-h-48 overflow-y-auto dark-scrollbar">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`w-full text-left px-4 py-2.5 text-[11px] font-medium tracking-[0.1px] hover:bg-white/5 transition-colors ${value === opt ? 'bg-white/10 text-white' : 'text-white/50'}`}
                onClick={() => { onChange(opt); setIsOpen(false); }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
