import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Tribunal — Fan-out / Majority-Vote Moderation",
  description:
    "Three independent LLM judges vote in parallel on borderline moderation calls. Majority verdict with a confidence threshold guardrail."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-ink text-fg font-body antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
