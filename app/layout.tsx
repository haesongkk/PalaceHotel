import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "호텔 관리자 페이지",
  description: "호텔 관리 시스템",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

