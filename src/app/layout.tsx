import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Figtree,
  Fleur_De_Leah,
  Gowun_Batang,
} from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { RootProviders } from "@/components/providers/root-providers";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

// Fonts for the "elegant" invitation template (Xoom design).
const fleurDeLeah = Fleur_De_Leah({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
});

const gowunBatang = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-serif-elegant",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wedboard",
  description: "Wedding & event management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        figtree.variable,
        fleurDeLeah.variable,
        gowunBatang.variable
      )}
    >
      <body className="min-h-full flex flex-col">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
