import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

import { TopBar } from "@/components/layout/TopBar";
import { Providers } from "@/components/providers";

import { layoutStyles } from "./layout.styles";

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

/**
 * Root layout: loads fonts, wraps the app in providers and renders the
 * top bar above the scrolling page content.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable} ${layoutStyles.html}`}>
      <body className={layoutStyles.body}>
        <Providers>
          <TopBar />
          <main className={layoutStyles.main}>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
