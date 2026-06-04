import React, { useEffect } from 'react';
import { PillButton } from './Primitives';

interface MediaAsset {
  mediaId: string;
  base64: string;
  mimeType: string;
  name: string;
  type: 'image' | 'video';
}

interface PreviewModalProps {
  asset: MediaAsset | null;
  onClose: () => void;
  onDownload: (asset: MediaAsset) => void;
  isDownloading: boolean;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  asset,
  onClose,
  onDownload,
  isDownloading
}) => {
  useEffect(() => {
    if (!asset) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [asset, onClose]);

  if (!asset) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

      <div
        className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 md:top-0 md:-right-12 text-white/40 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-[32px]">close</span>
        </button>

        {/* Media Preview */}
        <div className="relative group w-full h-full flex items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] shadow-2xl">
          {asset.type === 'video' ? (
            <video
              src={`data:${asset.mimeType};base64,${asset.base64}`}
              className="max-w-full max-h-full object-contain animate-zoom-in"
              autoPlay controls loop playsInline
            />
          ) : (
            <img
              src={`data:${asset.mimeType};base64,${asset.base64}`}
              className="max-w-full max-h-full object-contain animate-zoom-in"
              alt={asset.name}
            />
          )}
        </div>

        {/* Thanh công cụ dưới */}
        <div className="flex items-center gap-4 animate-slide-up">
          <PillButton
            variant="solid"
            onClick={() => onDownload(asset)}
            disabled={isDownloading}
            icon={<span className="material-symbols-outlined text-[20px]">{isDownloading ? 'check' : 'download'}</span>}
          >
            {isDownloading ? 'Đã tải xuống' : `Tải xuống ${asset.type === 'video' ? 'Video' : 'Ảnh'}`}
          </PillButton>

          <PillButton
            variant="outline"
            onClick={onClose}
          >
            Đóng
          </PillButton>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-zoom-in { animation: zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}} />
    </div>
  );
};
