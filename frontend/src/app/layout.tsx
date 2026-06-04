import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Mockup Generator",
  description: "Apply designs to product photos with realistic, AI-powered mockups.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
