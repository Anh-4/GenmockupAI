import { MockupGenerator } from "@/components/mockup-generator";

export default function Home() {
  return (
    <main className="container py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AI Mockup Generator
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Upload a product photo and a design — we classify the garment, segment
          it with SAM2, find the print area, and render a realistic mockup.
        </p>
      </header>
      <MockupGenerator />
    </main>
  );
}
