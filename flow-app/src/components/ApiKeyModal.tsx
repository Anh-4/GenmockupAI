import React, { useEffect, useState } from "react";
import { PillButton } from "./Primitives";

interface Props {
  open: boolean;
  /** True if a key already exists (allows dismissing without entering one). */
  hasExisting: boolean;
  initial?: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<Props> = ({ open, hasExisting, initial = "", onSave, onClose }) => {
  const [value, setValue] = useState(initial);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);

  if (!open) return null;

  const trimmed = value.trim();
  const looksValid = trimmed.startsWith("AIza") && trimmed.length >= 30;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => hasExisting && onClose()}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#141414] p-6 shadow-2xl animate-zoom-in">
        <div className="flex items-center gap-3 mb-1">
          <span className="material-symbols-outlined text-[22px] text-white/80">key</span>
          <h2 className="text-white font-semibold text-[15px]">Nhập Gemini API Key</h2>
        </div>
        <p className="text-white/40 text-[11px] leading-relaxed mb-4">
          Key được lưu cục bộ trên máy bạn (localStorage), không gửi đi đâu ngoài Google.
          Lấy key miễn phí tại{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:underline"
          >
            aistudio.google.com/apikey
          </a>
          .
        </p>

        <div className="relative mb-2">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="AIza..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed) onSave(trimmed);
            }}
            className="w-full h-[42px] rounded-2xl border border-white/10 focus:border-white/30 bg-white/[0.03] px-4 pr-10 text-[12px] text-white placeholder-white/20 focus:outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
            tabIndex={-1}
          >
            <span className="material-symbols-outlined text-[18px]">
              {show ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
        {trimmed && !looksValid && (
          <p className="text-amber-400/80 text-[10px] mb-2 pl-1">
            Key Gemini thường bắt đầu bằng "AIza". Kiểm tra lại nếu generate báo lỗi.
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <div className="flex-1">
            <PillButton variant="solid" disabled={!trimmed} onClick={() => onSave(trimmed)}>
              Lưu &amp; dùng
            </PillButton>
          </div>
          {hasExisting && (
            <div className="w-[100px]">
              <PillButton variant="outline" onClick={onClose}>
                Đóng
              </PillButton>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-zoom-in { animation: zoom-in 0.25s cubic-bezier(0.16,1,0.3,1); }
      `,
        }}
      />
    </div>
  );
};
