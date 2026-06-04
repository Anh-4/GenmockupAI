/** Typed client for the FastAPI backend. */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Classification {
  category: string;
  view: string;
  confidence: number;
  scores: Record<string, number>;
}

export interface PrintArea {
  quad: [number, number][];
  bbox: [number, number, number, number];
  confidence: number;
  source: string;
}

export interface MockupResult {
  asset_id: string;
  image_png: string; // base64 PNG
  url: string;
  print_area: PrintArea;
  classification: Classification | null;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function classify(image: File): Promise<Classification> {
  const fd = new FormData();
  fd.append("image", image);
  return handle(await fetch(`${API}/classify`, { method: "POST", body: fd }));
}

export async function generateMockup(opts: {
  product: File;
  design: File;
  category?: string;
  shadingStrength?: number;
  opacity?: number;
}): Promise<MockupResult> {
  const fd = new FormData();
  fd.append("product", opts.product);
  fd.append("design", opts.design);
  if (opts.category) fd.append("category", opts.category);
  fd.append("shading_strength", String(opts.shadingStrength ?? 0.85));
  fd.append("opacity", String(opts.opacity ?? 1.0));
  return handle(
    await fetch(`${API}/generate-mockup`, { method: "POST", body: fd })
  );
}

export const assetUrl = (path: string) => `${API}${path}`;
