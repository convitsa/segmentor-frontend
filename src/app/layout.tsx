import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Segmentor – No-Code Personalization for Solopreneurs",
  description: "No-Code Personalization for Solopreneurs",
  keywords: ["no-code", "personalization", "solopreneurs", "segmentation", "targeting", "ux", "ui", "product", "marketing", "growth"],
  authors: [{ name: "Segmentor", url: "https://segmentor.io" }],
  creator: "Segmentor",
  publisher: "Segmentor",
  metadataBase: new URL("https://segmentor.io"),
  openGraph: {
    title: "Segmentor – No-Code Personalization for Solopreneurs",
    description: "No-Code Personalization for Solopreneurs",
    type: "website",
    url: "https://segmentor.io",
    siteName: "Segmentor",
    images: [{ url: "https://segmentor.io/logo-white.svg" }],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="min-h-svh">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased min-h-svh`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
