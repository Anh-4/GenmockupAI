/**
 * `flow-sdk` adapter.
 *
 * The original app was written for Google Labs Flow, where a global `Flow`
 * runtime is injected by the host and proxies to Google's hosted models
 * (Nano Banana Pro, Omni Flash/Veo). That runtime is not available outside
 * Flow, so this module re-implements the same `Flow` surface on top of the
 * official **@google/genai** SDK so the app runs as a standalone web app.
 *
 * The key is supplied by the user at runtime (entered via the in-app popup
 * and saved to localStorage) — it is NOT baked into the build, so the app is
 * safe to share. A build-time `VITE_GEMINI_API_KEY` is used only as a dev
 * fallback when nothing is stored.
 */
import { GoogleGenAI } from "@google/genai";

// ---- Config ---------------------------------------------------------------

const env = import.meta.env as Record<string, string | undefined>;

const KEY_STORAGE = "gemini_api_key";
const ENV_KEY = env.VITE_GEMINI_API_KEY ?? ""; // dev-only fallback
const TEXT_MODEL = env.VITE_GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";
const IMAGE_MODEL = env.VITE_GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const VIDEO_MODEL = env.VITE_GEMINI_VIDEO_MODEL ?? "veo-3.0-fast-generate-001";

/** Current key: user-entered (localStorage) wins, else dev env fallback. */
export function getApiKey(): string {
  try {
    const k = localStorage.getItem(KEY_STORAGE);
    if (k) return k;
  } catch {
    /* localStorage unavailable */
  }
  return ENV_KEY;
}

export function hasApiKey(): boolean {
  return getApiKey().trim().length > 0;
}

/** Persist (or clear) the user's key and invalidate the cached client. */
export function setApiKey(key: string): void {
  try {
    if (key && key.trim()) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* ignore */
  }
  _client = null;
}

let _client: GoogleGenAI | null = null;
let _clientKey = "";
function client(): GoogleGenAI {
  const key = getApiKey();
  if (!key) {
    throw new Error("Chưa có Gemini API key. Bấm nút ⚙️ (góc trên phải) để nhập key.");
  }
  if (!_client || _clientKey !== key) {
    _client = new GoogleGenAI({ apiKey: key });
    _clientKey = key;
  }
  return _client;
}

// ---- Types (mirror the Flow runtime shapes the app expects) ---------------

interface ImageRef {
  base64: string;
  mimeType: string;
}
interface StoredMedia {
  base64: string;
  mimeType: string;
  name: string;
}
interface GeneratedAsset {
  mediaId: string;
  base64: string;
  mimeType: string;
}

// In-memory media store, keyed by an opaque mediaId (mirrors Flow's media DB).
const mediaStore = new Map<string, StoredMedia>();

function newId(): string {
  // crypto.randomUUID is available in all modern browsers.
  return (crypto as any).randomUUID?.() ?? `m_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
}

function store(media: StoredMedia): string {
  const id = newId();
  mediaStore.set(id, media);
  return id;
}

function refsToParts(mediaIds: string[]) {
  const parts: any[] = [];
  for (const id of mediaIds) {
    const m = mediaStore.get(id);
    if (m) parts.push({ inlineData: { mimeType: m.mimeType, data: m.base64 } });
  }
  return parts;
}

// ---- Browser helpers ------------------------------------------------------

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] || file.type || "image/png";
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

// ---- Flow API implementation ---------------------------------------------

const generate = {
  async text(
    prompt: string,
    opts?: { images?: ImageRef[]; systemInstruction?: string }
  ): Promise<{ text: string }> {
    const parts: any[] = [{ text: prompt }];
    for (const img of opts?.images ?? []) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
    const res: any = await client().models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts }],
      config: opts?.systemInstruction
        ? { systemInstruction: opts.systemInstruction }
        : undefined,
    });
    return { text: res.text ?? "" };
  },

  async image(args: {
    prompt: string;
    modelDisplayName?: string;
    model?: string;
    referenceImageMediaIds?: string[];
    aspectRatio?: string;
  }): Promise<GeneratedAsset> {
    const ar = args.aspectRatio ?? "1:1";
    // Bake the aspect ratio into the prompt as well — robust across models
    // that don't honour imageConfig.aspectRatio.
    const parts: any[] = [
      { text: `${args.prompt}\n\n[Output aspect ratio: ${ar}]` },
      ...refsToParts(args.referenceImageMediaIds ?? []),
    ];

    const res: any = await client().models.generateContent({
      model: args.model || IMAGE_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: { aspectRatio: ar },
      },
    });

    const outParts = res?.candidates?.[0]?.content?.parts ?? [];
    for (const p of outParts) {
      if (p?.inlineData?.data) {
        const mimeType = p.inlineData.mimeType || "image/png";
        const base64 = p.inlineData.data as string;
        return { mediaId: store({ base64, mimeType, name: "mockup" }), base64, mimeType };
      }
    }
    throw new Error(
      res?.text
        ? `Mô hình không trả về ảnh: ${res.text}`
        : "Mô hình không trả về ảnh. Kiểm tra quyền truy cập model ảnh của API key."
    );
  },

  async video(args: {
    prompt: string;
    modelDisplayName?: string;
    model?: string;
    referenceImageMediaIds?: string[];
    aspectRatio?: string;
    durationSeconds?: number;
  }): Promise<GeneratedAsset> {
    const ai = client();
    // Veo currently supports 16:9 / 9:16 — coerce square to landscape.
    const ar = args.aspectRatio === "1:1" ? "16:9" : args.aspectRatio ?? "16:9";

    // Optional image-to-video: seed with the first reference design.
    const firstRefId = args.referenceImageMediaIds?.[0];
    const seed = firstRefId ? mediaStore.get(firstRefId) : undefined;

    const req: any = {
      model: args.model || VIDEO_MODEL,
      prompt: args.prompt,
      config: {
        numberOfVideos: 1,
        aspectRatio: ar,
        ...(args.durationSeconds ? { durationSeconds: args.durationSeconds } : {}),
      },
    };
    if (seed) req.image = { imageBytes: seed.base64, mimeType: seed.mimeType };

    let op: any = await ai.models.generateVideos(req);
    // Poll the long-running operation until the video is ready.
    while (!op?.done) {
      await new Promise((r) => setTimeout(r, 8000));
      op = await ai.operations.getVideosOperation({ operation: op });
    }

    const gen = op?.response?.generatedVideos?.[0];
    const fileUri: string | undefined = gen?.video?.uri ?? gen?.video?.videoUri;
    if (!fileUri) throw new Error("Veo không trả về video (key có thể chưa có quyền Veo).");

    // Fetch the bytes (the file endpoint needs the API key) and inline as base64.
    const resp = await fetch(fileUri, { headers: { "x-goog-api-key": getApiKey() } });
    if (!resp.ok) throw new Error(`Tải video thất bại: HTTP ${resp.status}`);
    const buf = new Uint8Array(await resp.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    const base64 = btoa(binary);
    const mimeType = "video/mp4";
    return { mediaId: store({ base64, mimeType, name: "video" }), base64, mimeType };
  },
};

async function upload(args: {
  base64: string;
  mimeType: string;
  name: string;
}): Promise<{ mediaId: string }> {
  return { mediaId: store({ base64: args.base64, mimeType: args.mimeType, name: args.name }) };
}

const media = {
  select(opts?: { filter?: "image" | "video" }): Promise<{
    mediaId: string;
    base64: string;
    mimeType: string;
    name: string;
  }> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = opts?.filter === "video" ? "video/*" : "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return reject(new Error("Không có file nào được chọn."));
        const { base64, mimeType } = await fileToBase64(file);
        const name = file.name;
        resolve({ mediaId: store({ base64, mimeType, name }), base64, mimeType, name });
      };
      // Fired when the picker is dismissed without a selection (modern browsers).
      (input as any).oncancel = () => reject(new Error("Đã huỷ chọn ảnh."));
      input.click();
    });
  },
};

async function download(args: {
  base64: string;
  mimeType: string;
  filename: string;
}): Promise<void> {
  const blob = base64ToBlob(args.base64, args.mimeType);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = args.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const Flow = { generate, upload, media, download };
export default Flow;
