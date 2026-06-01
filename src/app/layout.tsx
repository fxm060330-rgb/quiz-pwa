import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import TabBar from "@/components/TabBar";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "刷题 PWA",
  description: "章节练习、模拟考试、错题本、答题统计",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "刷题",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A365D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

function DarkModeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            var dm = localStorage.getItem("darkMode");
            if (dm === "1") document.documentElement.classList.add("dark");
          } catch(e) {}
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <DarkModeScript />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased bg-warm text-text-primary">
        <AppProvider>
          <main className="pb-16 min-h-screen max-w-lg mx-auto">
            {children}
          </main>
          <TabBar />
          <PwaRegister />
        </AppProvider>
      </body>
    </html>
  );
}
