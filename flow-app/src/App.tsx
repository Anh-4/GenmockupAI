import React, { useState, useEffect, useCallback } from 'react';
import { Flow } from 'flow-sdk';
import {
  SectionLabel,
  PillButton,
  TextInput,
  FieldDisplay,
  SegmentedToggle,
  FieldDropdown
} from './components/Primitives';
import { PreviewModal } from './components/PreviewModal';

// --- Types ---

interface MediaAsset {
  mediaId: string;
  base64: string;
  mimeType: string;
  name: string;
  type: 'image' | 'video';
}

interface ScenePreset {
  id: string;
  name: string;
  icon: string;
  prompt: string; // Sử dụng {garment} làm placeholder
}

const PRODUCT_TYPES = [
  { value: 't-shirt', label: 'Áo thun' },
  { value: 'hoodie', label: 'Áo Hoodie' },
  { value: 'sweatshirt', label: 'Áo nỉ (Sweatshirt)' },
  { value: 'polo shirt', label: 'Áo Polo' },
  { value: 'short sleeve button-up shirt', label: 'Áo sơ mi tay ngắn' },
  { value: 'tank top', label: 'Áo ba lỗ' },
  { value: 'jacket', label: 'Áo khoác' },
  { value: 'jogger pants', label: 'Quần Jogger' },
];

const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'studio_male',
    name: 'Người mẫu nam',
    icon: 'person',
    prompt: 'A professional male model wearing a premium heavy cotton {garment} in a minimalist studio setting, clean lighting, high-end fashion photography.'
  },
  {
    id: 'studio_female',
    name: 'Người mẫu nữ',
    icon: 'face',
    prompt: 'A professional female model wearing a premium {garment}, studio lighting, neutral background, cinematic fashion shot.'
  },
  {
    id: 'couple_studio',
    name: 'Cặp đôi nam nữ',
    icon: 'group',
    prompt: 'A stylish fashion couple in a professional studio. The male model is standing facing the camera directly. The female model is standing next to him with her back turned toward the camera, resting her hand and arm comfortably on the male model\'s shoulder, and looking back at the camera over her shoulder with a subtle head turn. Both are wearing premium {garment}s. Clean minimalist background, cinematic fashion lighting.'
  },
  {
    id: 'flat_3d_split',
    name: '3D Trước & Sau',
    icon: 'view_quilt',
    prompt: 'A premium 3D flat lay presentation showing BOTH the FRONT and BACK of a {garment} arranged together side-by-side in a single high-quality frame. Clean minimalist background, professional studio lighting, realistic fabric textures and sharp details.'
  },
  {
    id: 'flat_3d_front',
    name: '3D Mặt trước',
    icon: 'view_in_ar',
    prompt: 'A high-quality 3D flat lay of the FRONT of a {garment} on a clean solid background, soft shadows, sharp details, top-down perspective.'
  },
  {
    id: 'flat_3d_back',
    name: '3D Mặt sau',
    icon: 'flip',
    prompt: 'A high-quality 3D flat lay of the BACK of a {garment} on a clean solid background, soft shadows, sharp details, top-down perspective.'
  },
  {
    id: 'closeup',
    name: 'Cận cảnh vải',
    icon: 'zoom_in',
    prompt: 'Extreme close-up macro shot of a {garment} fabric, focusing on the high-quality texture and the printed design details, soft shallow depth of field, premium apparel details.'
  }
];

export default function App() {
  const [frontDesign, setFrontDesign] = useState<Omit<MediaAsset, 'type'> | null>(null);
  const [backDesign, setBackDesign] = useState<Omit<MediaAsset, 'type'> | null>(null);
  const [garmentType, setGarmentType] = useState('t-shirt');
  const [selectedSceneId, setSelectedSceneId] = useState(SCENE_PRESETS[0].id);
  const [customPrompt, setCustomPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '4:3'>('1:1');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [videoDuration, setVideoDuration] = useState(10);

  const [singleResult, setSingleResult] = useState<MediaAsset | null>(null);
  const [batchResults, setBatchResults] = useState<MediaAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, 'idle' | 'busy' | 'done'>>({});
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  const [hoveredSide, setHoveredSide] = useState<'front' | 'back' | null>(null);

  useEffect(() => {
    const id = 'mockup-pro-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; background: #0e0e0e; overflow: hidden; font-family: 'Google Sans Text', sans-serif; }
      .dark-scrollbar { scrollbar-width: thin; scrollbar-color: #595959 transparent; }
      .dark-scrollbar::-webkit-scrollbar { width: 6px; }
      .dark-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .dark-scrollbar::-webkit-scrollbar-thumb { background: #595959; border-radius: 9999px; }
      @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      .shimmer { background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 100%); background-size: 200% 100%; animation: shimmer 2s infinite; }
      @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
      @keyframes dropdown-enter { from { opacity: 0; transform: scale(0.95) translateY(-5px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      .animate-dropdown { animation: dropdown-enter 0.15s ease-out forwards; }
    `;
    document.head.appendChild(style);
  }, []);

  const detectGarmentType = useCallback(async (asset: Omit<MediaAsset, 'type'>) => {
    setIsDetecting(true);
    try {
      const response = await Flow.generate.text(
        "Analyze this design image and identify the specific garment type (e.g., t-shirt, hoodie, sweatshirt, polo shirt, tank top, jacket, jogger pants). Return ONLY the exact name of the garment in lowercase English.",
        {
          images: [{ base64: asset.base64, mimeType: asset.mimeType }],
          systemInstruction: "You are a professional fashion expert. Identify the garment type with high accuracy based on silhouettes, hoods, collars, and pockets."
        }
      );

      const detected = response.text.trim().toLowerCase();
      const match = PRODUCT_TYPES.find(t => detected.includes(t.value) || t.value.includes(detected));
      if (match) {
        setGarmentType(match.value);
      }
    } catch (e) {
      console.error("Auto-detection failed", e);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!hoveredSide) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          const [header, base64] = dataUrl.split(',');
          const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';

          try {
            const uploaded = await Flow.upload({
              base64,
              mimeType,
              name: `Pasted_${hoveredSide}_${Date.now()}`
            });

            const asset: Omit<MediaAsset, 'type'> = {
              mediaId: uploaded.mediaId,
              base64,
              mimeType,
              name: hoveredSide === 'front' ? 'Mặt trước (Pasted)' : 'Mặt sau (Pasted)'
            };

            if (hoveredSide === 'front') {
              setFrontDesign(asset);
              detectGarmentType(asset);
            } else {
              setBackDesign(asset);
            }
            setError(null);
          } catch (err) {
            console.error("Paste upload failed", err);
            setError("Không thể xử lý ảnh dán từ clipboard.");
          }
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }, [hoveredSide, detectGarmentType]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleSelectDesign = async (side: 'front' | 'back') => {
    try {
      const media = await Flow.media.select({ filter: 'image' });
      if (side === 'front') {
        setFrontDesign(media);
        detectGarmentType(media);
      } else {
        setBackDesign(media);
      }
      setError(null);
    } catch (e) {
      console.error(e);
    }
  };

  const generateSingleMockup = async (presetId: string, currentRefs: string[]): Promise<MediaAsset> => {
    const scene = SCENE_PRESETS.find(s => s.id === presetId);
    const scenePrompt = (scene?.prompt || '').replace(/{garment}/g, garmentType);

    if (mediaType === 'video') {
      const videoPrompt = `Cinematic high-end fashion video of a model wearing a ${garmentType}. ${scenePrompt}
      The model is moving naturally, showing the fit and flow of the fabric.
      ACCURATELY maintain the design and colors from the reference images.
      Hyper-realistic fashion film, 4k, smooth motion, high detail. ${customPrompt}`;

      // Sử dụng Omni Flash làm mặc định
      const response = await Flow.generate.video({
        prompt: videoPrompt,
        modelDisplayName: 'Omni Flash',
        referenceImageMediaIds: currentRefs,
        // Nếu chọn 1:1 mà model chưa hỗ trợ, SDK có thể tự điều chỉnh hoặc báo lỗi tùy thuộc vào server-side
        aspectRatio: aspectRatio as any,
        durationSeconds: videoDuration,
      });

      return {
        mediaId: response.mediaId,
        base64: response.base64,
        mimeType: response.mimeType,
        name: `VideoMockup_${presetId}`,
        type: 'video'
      };
    } else {
      const imagePrompt = `Professional mockup production for a ${garmentType}. ${scenePrompt}
      ACCURATELY transfer the graphic design, logo, and colors from the reference images onto the ${garmentType}.
      The design must look realistic, following fabric folds and lighting.
      Details: ${customPrompt || 'High-quality print'}.
      Commercial product photography, 8k resolution.`;

      const response = await Flow.generate.image({
        prompt: imagePrompt,
        modelDisplayName: '🍌 Nano Banana Pro',
        referenceImageMediaIds: currentRefs,
        aspectRatio: aspectRatio as any,
      });

      return {
        mediaId: response.mediaId,
        base64: response.base64,
        mimeType: response.mimeType,
        name: `Mockup_${presetId}`,
        type: 'image'
      };
    }
  };

  const handleGenerateSingle = async () => {
    if (!frontDesign) {
      setError('Vui lòng tải lên ảnh mặt trước.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    setSingleResult(null);
    setBatchResults([]);
    setBatchProgress(0);

    try {
      const refs = [frontDesign.mediaId];
      if (backDesign) refs.push(backDesign.mediaId);
      const res = await generateSingleMockup(selectedSceneId, refs);
      setSingleResult(res);
    } catch (err: any) {
      setError(err.message || 'Không thể tạo mockup.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBatch = async () => {
    if (!frontDesign) {
      setError('Vui lòng tải lên ảnh mặt trước.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    setSingleResult(null);
    setBatchResults([]);
    setBatchProgress(0);

    const refs = [frontDesign.mediaId];
    if (backDesign) refs.push(backDesign.mediaId);

    const results: MediaAsset[] = [];
    try {
      const presetsToBatch = mediaType === 'video' ? SCENE_PRESETS.slice(0, 3) : SCENE_PRESETS;

      for (let i = 0; i < presetsToBatch.length; i++) {
        setBatchProgress(i + 1);
        const res = await generateSingleMockup(presetsToBatch[i].id, refs);
        results.push(res);
        setBatchResults([...results]);
      }
    } catch (err: any) {
      setError('Đã xảy ra lỗi trong quá trình tạo combo. Một số nội dung có thể chưa hoàn tất.');
    } finally {
      setIsGenerating(false);
      setBatchProgress(0);
    }
  };

  const handleDownload = async (asset: MediaAsset) => {
    setSaveStates(prev => ({ ...prev, [asset.mediaId]: 'busy' }));
    try {
      const ext = asset.type === 'video' ? 'mp4' : 'jpg';
      await Flow.download({
        base64: asset.base64,
        mimeType: asset.mimeType,
        filename: `${asset.name}_${Date.now()}.${ext}`
      });
      setSaveStates(prev => ({ ...prev, [asset.mediaId]: 'done' }));
      setTimeout(() => setSaveStates(prev => ({ ...prev, [asset.mediaId]: 'idle' })), 2000);
    } catch (e) {
      setSaveStates(prev => ({ ...prev, [asset.mediaId]: 'idle' }));
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0e0e0e]">
      {/* Cột trái: Tải ảnh thiết kế */}
      <div className="w-[300px] flex flex-col border-r border-white/10 p-3 gap-6 overflow-y-auto dark-scrollbar">
        <div className="flex flex-col gap-3">
          <SectionLabel>Thiết kế sản phẩm</SectionLabel>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-white/40 uppercase tracking-widest pl-2">Mặt trước</p>
            <div
              onMouseEnter={() => setHoveredSide('front')}
              onMouseLeave={() => setHoveredSide(null)}
              onClick={() => handleSelectDesign('front')}
              className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
                frontDesign
                ? 'border-white/20 bg-white/5'
                : hoveredSide === 'front'
                  ? 'border-blue-500/50 bg-blue-500/5'
                  : 'border-white/10 hover:border-white/30 bg-white/[0.02]'
              }`}
            >
              {frontDesign ? (
                <>
                  <img src={`data:${frontDesign.mimeType};base64,${frontDesign.base64}`} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-1">
                    <span className="text-white text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">Dán (Ctrl+V)</span>
                    <span className="text-white/60 text-[9px]">hoặc Click để đổi</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className={`material-symbols-outlined text-[32px] transition-colors ${hoveredSide === 'front' ? 'text-blue-400' : 'text-white/10'}`}>
                    {hoveredSide === 'front' ? 'content_paste' : 'upload_file'}
                  </span>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-white/40 font-medium">Click để chọn</span>
                    <span className="text-[9px] text-white/20">hoặc Ctrl + V để dán</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-white/40 uppercase tracking-widest pl-2">Mặt sau (Tùy chọn)</p>
            <div
              onMouseEnter={() => setHoveredSide('back')}
              onMouseLeave={() => setHoveredSide(null)}
              onClick={() => handleSelectDesign('back')}
              className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
                backDesign
                ? 'border-white/20 bg-white/5'
                : hoveredSide === 'back'
                  ? 'border-blue-500/50 bg-blue-500/5'
                  : 'border-white/10 hover:border-white/30 bg-white/[0.02]'
              }`}
            >
              {backDesign ? (
                <>
                  <img src={`data:${backDesign.mimeType};base64,${backDesign.base64}`} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-1">
                    <span className="text-white text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">Dán (Ctrl+V)</span>
                    <span className="text-white/60 text-[9px]">hoặc Click để đổi</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className={`material-symbols-outlined text-[32px] transition-colors ${hoveredSide === 'back' ? 'text-blue-400' : 'text-white/10'}`}>
                    {hoveredSide === 'back' ? 'content_paste' : 'add_photo_alternate'}
                  </span>
                  {hoveredSide === 'back' && <span className="text-[9px] text-white/20">Ctrl + V</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SectionLabel>Cấu hình sản phẩm</SectionLabel>

          <div className="flex flex-col gap-2">
             <div className="flex items-center justify-between px-2">
               <p className="text-[10px] text-white/30 uppercase tracking-widest">Loại sản phẩm</p>
               {isDetecting && (
                 <span className="text-[9px] text-blue-400 font-medium animate-pulse">Đang nhận diện...</span>
               )}
             </div>
             <FieldDropdown
               label=""
               value={PRODUCT_TYPES.find(t => t.value === garmentType)?.label || 'Chọn loại áo/quần'}
               options={PRODUCT_TYPES.map(t => t.label)}
               onChange={(label) => setGarmentType(PRODUCT_TYPES.find(t => t.label === label)?.value || 't-shirt')}
             />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest pl-2">Mô tả thêm</p>
            <TextInput
              value={customPrompt}
              onChange={setCustomPrompt}
              placeholder="Chất liệu vải nỉ, form rộng, in decal bóng..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest pl-2">Tỷ lệ {mediaType === 'video' ? '(Omni Flash)' : ''}</p>
            <SegmentedToggle
              value={aspectRatio}
              onChange={(v) => setAspectRatio(v as any)}
              items={[
                { value: '1:1', label: '1:1' },
                { value: '16:9', label: '16:9' },
                { value: '9:16', label: '9:16' },
              ]}
            />
          </div>

          {mediaType === 'video' && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest pl-2">Thời lượng</p>
              <SegmentedToggle
                value={String(videoDuration)}
                onChange={(v) => setVideoDuration(Number(v))}
                items={[
                  { value: '6', label: '6s' },
                  { value: '8', label: '8s' },
                  { value: '10', label: '10s' },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Khu vực giữa: Preview kết quả */}
      <div className="flex-1 relative bg-[#080808] overflow-y-auto dark-scrollbar p-6">
        {isGenerating && batchProgress > 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-8">
            <div className="relative w-24 h-24">
               <div className="absolute inset-0 border-4 border-white/5 border-t-white/60 rounded-full animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
                 {batchProgress}/{mediaType === 'video' ? 3 : SCENE_PRESETS.length}
               </div>
            </div>
            <div className="text-center">
              <h3 className="text-white/80 font-medium mb-1">Đang tạo bộ {mediaType === 'video' ? 'Video' : 'Mockup'} cho {PRODUCT_TYPES.find(t => t.value === garmentType)?.label}</h3>
              <p className="text-white/40 text-xs uppercase tracking-widest animate-pulse">Vui lòng đợi trong giây lát... {mediaType === 'video' ? '(Video có thể mất 1-3 phút)' : ''}</p>
            </div>
            {batchResults.length > 0 && (
              <div className="grid grid-cols-3 gap-4 w-full max-w-4xl opacity-50">
                {batchResults.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                    {img.type === 'video' ? (
                       <div className="w-full h-full flex items-center justify-center bg-white/5">
                         <span className="material-symbols-outlined text-white/20">videocam</span>
                       </div>
                    ) : (
                       <img src={`data:${img.mimeType};base64,${img.base64}`} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-2 border-white/5 border-t-white/60 rounded-full animate-spin" />
            <p className="text-white/40 text-[10px] uppercase tracking-[0.2em]">Đang xử lý {mediaType === 'video' ? 'Video' : 'Mockup'} {PRODUCT_TYPES.find(t => t.value === garmentType)?.label}...</p>
            {mediaType === 'video' && <p className="text-white/20 text-[9px]">Video generation typically takes 1-2 minutes.</p>}
          </div>
        ) : batchResults.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {batchResults.map((img) => (
              <div
                key={img.mediaId}
                onClick={() => setPreviewAsset(img)}
                className="group relative aspect-square rounded-3xl bg-white/[0.02] border border-white/10 overflow-hidden shadow-2xl transition-all hover:scale-[1.02] hover:border-white/20 animate-slide-up cursor-zoom-in"
              >
                {img.type === 'video' ? (
                   <video
                     src={`data:${img.mimeType};base64,${img.base64}`}
                     className="w-full h-full object-cover"
                     autoPlay muted loop playsInline
                   />
                ) : (
                   <img src={`data:${img.mimeType};base64,${img.base64}`} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-white text-[32px]">{img.type === 'video' ? 'play_circle' : 'zoom_in'}</span>
                  <PillButton
                    variant="solid"
                    onClick={(e) => { e.stopPropagation(); handleDownload(img); }}
                    icon={<span className="material-symbols-outlined text-[18px]">{saveStates[img.mediaId] === 'done' ? 'check' : 'download'}</span>}
                  >
                    {saveStates[img.mediaId] === 'done' ? 'Đã lưu' : 'Tải xuống'}
                  </PillButton>
                </div>
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/60 border border-white/10 flex items-center gap-1">
                   <span className="material-symbols-outlined text-[12px] text-white/80">{img.type === 'video' ? 'videocam' : 'image'}</span>
                   <span className="text-[9px] text-white/80 font-bold uppercase">{img.type}</span>
                </div>
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                   <p className="text-[9px] text-white/60 font-medium uppercase tracking-wider">
                     {SCENE_PRESETS.find(p => img.name.includes(p.id))?.name}
                   </p>
                </div>
              </div>
            ))}
          </div>
        ) : singleResult ? (
          <div className="h-full flex items-center justify-center p-4">
            <div
              className="relative group max-w-lg w-full animate-slide-up cursor-zoom-in"
              onClick={() => setPreviewAsset(singleResult)}
            >
              {singleResult.type === 'video' ? (
                 <video
                  src={`data:${singleResult.mimeType};base64,${singleResult.base64}`}
                  className="w-full rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border border-white/10"
                  autoPlay muted loop playsInline
                 />
              ) : (
                <img
                  src={`data:${singleResult.mimeType};base64,${singleResult.base64}`}
                  className="w-full rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border border-white/10"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-3xl">
                 <span className="material-symbols-outlined text-white text-[48px] drop-shadow-lg">{singleResult.type === 'video' ? 'play_circle' : 'zoom_in'}</span>
              </div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <PillButton
                  variant="solid"
                  onClick={(e) => { e.stopPropagation(); handleDownload(singleResult); }}
                  icon={<span className="material-symbols-outlined text-[18px]">{saveStates[singleResult.mediaId] === 'done' ? 'check' : 'download'}</span>}
                >
                  Tải xuống {singleResult.type === 'video' ? 'Video' : 'Ảnh'}
                </PillButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-white/10">inventory_2</span>
            </div>
            <div className="max-w-xs">
              <h2 className="text-white/60 font-medium mb-2">Thông minh hơn với Mockup AI</h2>
              <p className="text-white/30 text-xs leading-relaxed">Hệ thống sẽ tự nhận diện loại sản phẩm (Hoodie, Quần Jogger, Polo...) từ ảnh thiết kế của bạn để tạo mockup tương ứng.</p>
              <p className="text-white/20 text-[10px] mt-4 uppercase tracking-widest italic">Mẹo: Di chuột vào ô tải ảnh và nhấn Ctrl+V để dán trực tiếp!</p>
            </div>
          </div>
        )}
      </div>

      {/* Cột phải: Lựa chọn phong cách */}
      <div className="w-[300px] flex flex-col border-l border-white/10 p-3 gap-6">
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto dark-scrollbar pr-1">
          <div className="flex flex-col gap-3">
            <SectionLabel>Kiểu chụp & Chế độ</SectionLabel>

            <SegmentedToggle
              value={mediaType}
              onChange={(v) => {
                setMediaType(v as any);
              }}
              items={[
                { value: 'image', label: 'Ảnh Chụp', icon: <span className="material-symbols-outlined text-[14px]">image</span> },
                { value: 'video', label: 'Video Clip', icon: <span className="material-symbols-outlined text-[14px]">videocam</span> },
              ]}
            />

            <div className="grid grid-cols-1 gap-1.5 mt-2">
              {SCENE_PRESETS.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => setSelectedSceneId(scene.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                    selectedSceneId === scene.id
                    ? 'bg-white/10 border-white/20'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedSceneId === scene.id ? 'bg-white text-black' : 'bg-white/5 text-white/30'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">{scene.icon}</span>
                  </div>
                  <span className={`text-[11px] font-medium ${selectedSceneId === scene.id ? 'text-white' : 'text-white/50'}`}>
                    {scene.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <SectionLabel>Thông số Mockup</SectionLabel>
            <FieldDisplay label="Sản phẩm hiện tại" value={PRODUCT_TYPES.find(t => t.value === garmentType)?.label || 'Chưa xác định'} />
            <FieldDisplay label="Chất lượng" value={mediaType === 'video' ? 'Omni Flash HD' : 'Ultra HD 8K'} />
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] flex gap-2">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {error}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
          <PillButton
            variant="solid"
            onClick={handleGenerateBatch}
            disabled={isGenerating || !frontDesign}
            icon={<span className="material-symbols-outlined text-[18px]">auto_awesome_motion</span>}
          >
            {isGenerating && batchProgress > 0 ? 'Đang tạo...' : `Tạo Combo ${mediaType === 'video' ? '3' : SCENE_PRESETS.length} ${mediaType === 'video' ? 'Video' : 'Mockup'}`}
          </PillButton>

          <PillButton
            variant="outline"
            onClick={handleGenerateSingle}
            disabled={isGenerating || !frontDesign}
            icon={<span className="material-symbols-outlined text-[18px]">{mediaType === 'video' ? 'videocam' : 'image'}</span>}
          >
            {mediaType === 'video' ? 'Tạo video đơn' : 'Chỉ tạo ảnh đơn'}
          </PillButton>
        </div>
      </div>

      {/* Modal xem trước */}
      <PreviewModal
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
        onDownload={handleDownload}
        isDownloading={previewAsset ? saveStates[previewAsset.mediaId] === 'done' : false}
      />
    </div>
  );
}
