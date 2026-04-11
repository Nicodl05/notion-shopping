import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Notion Shopping 🛒",
  description: "Générez vos listes de courses depuis Notion avec l'IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-dm-sans)] bg-[#F8F7F4] text-[#1A1A1A]">
        {children}
      </body>
    </html>
  );
}
