import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { DataProvider } from "@/components/data-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Дневник малыша",
  description: "Кормления, сон и туалет малыша в одном месте",
  appleWebApp: {
    capable: true,
    title: "Малыш",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full">
        <DataProvider>
          <AppShell>{children}</AppShell>
        </DataProvider>
      </body>
    </html>
  );
}
