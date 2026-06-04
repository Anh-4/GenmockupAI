"use client";

import * as React from "react";
import { Download, Loader2, Sparkles } from "lucide-react";
import { ImageDropzone } from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { generateMockup, type MockupResult } from "@/lib/api";

const CATEGORIES = [
  "auto",
  "tshirt",
  "polo",
  "hoodie",
  "jersey",
  "tanktop",
  "shorts",
  "pants",
  "cap",
  "mug",
];

export function MockupGenerator() {
  const [product, setProduct] = React.useState<File | null>(null);
  const [design, setDesign] = React.useState<File | null>(null);
  const [category, setCategory] = React.useState("auto");
  const [shading, setShading] = React.useState(0.85);
  const [opacity, setOpacity] = React.useState(1.0);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<MockupResult | null>(null);

  const canGenerate = product && design && !loading;

  async function onGenerate() {
    if (!product || !design) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateMockup({
        product,
        design,
        category: category === "auto" ? undefined : category,
        shadingStrength: shading,
        opacity,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${result.image_png}`;
    a.download = `mockup-${result.asset_id}.png`;
    a.click();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ---- Inputs ---- */}
      <Card>
        <CardHeader>
          <CardTitle>1 · Upload images</CardTitle>
          <CardDescription>
            A product photo and a design with a transparent background.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <ImageDropzone
              label="Product photo"
              hint="JPG / PNG / WebP"
              file={product}
              onChange={setProduct}
            />
            <ImageDropzone
              label="Design (PNG)"
              hint="Transparent PNG"
              file={design}
              onChange={setDesign}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Product type</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "auto" ? "Auto-detect" : c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <Label>Texture &amp; shadow</Label>
                <span className="text-muted-foreground">{shading.toFixed(2)}</span>
              </div>
              <Slider
                value={[shading]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => setShading(v)}
              />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <Label>Design opacity</Label>
                <span className="text-muted-foreground">{opacity.toFixed(2)}</span>
              </div>
              <Slider
                value={[opacity]}
                min={0.1}
                max={1}
                step={0.05}
                onValueChange={([v]) => setOpacity(v)}
              />
            </div>
          </div>

          <Button className="w-full" disabled={!canGenerate} onClick={onGenerate}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles /> Generate mockup
              </>
            )}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* ---- Output ---- */}
      <Card>
        <CardHeader>
          <CardTitle>2 · Result</CardTitle>
          <CardDescription>
            {result?.classification
              ? `Detected ${result.classification.category} · ${result.classification.view} · ${(result.classification.confidence * 100).toFixed(0)}% conf.`
              : "Your generated mockup will appear here."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-[repeating-conic-gradient(#f3f4f6_0_25%,#fff_0_50%)] bg-[length:24px_24px]">
            {result ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${result.image_png}`}
                alt="Generated mockup"
                className="h-full w-full object-contain"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No mockup yet</p>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full"
            disabled={!result}
            onClick={download}
          >
            <Download /> Download PNG
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
