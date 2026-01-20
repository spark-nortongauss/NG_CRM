import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "dropzone/dist/dropzone.css";
import { LayoutShell } from "@/components/layout-shell";
import { Header } from "@/components/header";
import { AppStoreProvider } from "@/providers/app-store-provider";

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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppStoreProvider>
          <LayoutShell header={<Header />}>
            {children}
          </LayoutShell>
        </AppStoreProvider>
      </body>
    </html>
  );
}
