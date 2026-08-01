import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AD TERMINAL | Multi-Device Command Platform",
  description: "Enterprise-grade autonomous command and control platform with AI integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-[#0f172a] text-slate-50">
        {children}
      </body>
    </html>
  );
}
