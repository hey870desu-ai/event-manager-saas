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
  metadataBase: new URL("https://event-manager.app"),

  title: {
    template: '%s | イベントシステム絆太郎（ばんたろう）',
    default: 'イベントシステム絆太郎（ばんたろう）| セミナー・イベント管理',
  },
  description: "イベントシステム絆太郎（ばんたろう）は、セミナー・イベントのLP作成からフォーム作成・名簿管理・メール配信までスマホで完結する管理システムです。",

  icons: {
    icon: '/icon.webp',
  },

  openGraph: {
    title: "イベントシステム絆太郎（ばんたろう）",
    description: "セミナー・イベントのLP作成からフォーム作成・名簿管理・メール配信までスマホで完結。イベントシステム絆太郎（ばんたろう）。",
    siteName: "イベントシステム絆太郎",
    url: "https://event-manager.app",
    images: [
      {
        url: "/icon.webp",
        width: 256,
        height: 256,
        alt: "イベントシステム絆太郎ロゴ",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },

  twitter: {
    card: "summary",
    title: "イベントシステム絆太郎（ばんたろう）",
    description: "セミナー・イベントのLP作成からフォーム作成・名簿管理・メール配信までスマホで完結。",
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