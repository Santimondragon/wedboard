import type { Metadata } from "next";
import {
  Inter,
  Bricolage_Grotesque,
  Fleur_De_Leah,
  Gowun_Batang,
} from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { RootProviders } from "@/components/providers/root-providers";

// Dashboard + marketing body text.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Dashboard + marketing display face — consumed via `--font-heading`, which
// every shadcn title primitive (card/dialog/sheet/alert-dialog) already uses.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

// Fonts for the "elegant" invitation template.
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
        "font-sans",
        inter.variable,
        bricolage.variable,
        fleurDeLeah.variable,
        gowunBatang.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
