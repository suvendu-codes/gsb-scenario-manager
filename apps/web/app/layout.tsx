import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

import { TopBar } from "@/components/layout/TopBar";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Scenario Manager",
  description: "Create, configure and run warehouse scenarios.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex h-full flex-col">
        <Providers>
          <TopBar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
