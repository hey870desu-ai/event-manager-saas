import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // ▼ 新ドメインを設定（これ重要！）
  metadataBase: new URL("https://event-manager.app"),

  title: {
    template: '%s | Event Manager', 
    default: 'Event Manager SaaS',
  },
  description: "イベント管理の「面倒」をゼロにする。スマホで完結する申し込み・管理システム。",
  
  icons: {
    icon: '/icon.webp', // ブラウザタブ用
  },

  openGraph: {
    title: "Event Manager SaaS",
    description: "スマホで完結！イベント申し込み・管理システム。",
    siteName: "Event Manager SaaS",
    url: "https://event-manager.app",
    images: [
      {
        // ▼ ここを実際のファイル名に変更しました！
        url: "/icon.webp", 
        width: 256,
        height: 256,
        alt: "Event Manager Logo",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },

  twitter: {
    card: "summary",
    title: "Event Manager SaaS",
    description: "スマホで完結！イベント申し込み・管理システム。",
    // ▼ ここも変更！
    images: ["/icon.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}