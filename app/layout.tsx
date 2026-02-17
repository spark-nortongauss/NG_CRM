import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "dropzone/dist/dropzone.css";
import { LayoutShell } from "@/components/layout-shell";
import { Header } from "@/components/header";
import { AppStoreProvider } from "@/providers/app-store-provider";
import { IdleLogoutProvider } from "@/providers/IdleLogoutProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Norton-Gauss CRM",
  description: "Internal CRM for Norton-Gauss",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('ng-crm-theme');
                if (t === 'dark' && window.location.pathname !== '/login') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppStoreProvider>
          <ThemeProvider>
            <IdleLogoutProvider>
              <LayoutShell header={<Header />}>
                {children}
              </LayoutShell>
            </IdleLogoutProvider>
          </ThemeProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
