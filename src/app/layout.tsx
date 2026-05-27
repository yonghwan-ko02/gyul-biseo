import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "귤비서 — 감귤 농가 AI 비서",
  description:
    "음성 한마디로 출하·정산·영농일지를 기록하는 감귤 농가 전용 AI 비서 서비스",
  keywords: ["감귤", "농가", "장부", "AI", "음성", "정산"],
  icons: { icon: "/favicon.ico" },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: "#FF8C00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 한국어 웹폰트 */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
