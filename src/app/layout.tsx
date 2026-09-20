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
  title: "限界ずんだもん錬成",
  description: "記憶喪失のずんだもんに、新たな性格と過去を教え込もう！",
  icons: {
    icon: '/icon.png',
  },
  openGraph: {
    title: "限界ずんだもん錬成",
    description: "記憶喪失のずんだもんに、新たな性格と過去を教え込もう！",
    siteName: "限界ずんだもん錬成",
    images: [
      {
        url: '/ogp.png',
        width: 1200,
        height: 630,
        alt: '限界ずんだもん錬成 OGP',
      }
    ],
    type: 'website',
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: "限界ずんだもん錬成",
    description: "記憶喪失のずんだもんに、新たな性格と過去を教え込もう！",
    images: ['/ogp.png'],
  },
};

import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
