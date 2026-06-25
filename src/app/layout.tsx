import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draft Gallery 乙級術科",
  description:
    "室內設計乙級術科的藝廊式應考準備網站，整合圖庫、上傳、練習複盤與扣分點資料。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
