import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notion Shopping",
  description: "Générez votre liste de courses depuis Notion avec Claude AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
