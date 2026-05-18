import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Serif, Inter, Mona_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-ibm-plex-serif",
  subsets: ["latin"],
  weight:['400','500','600','700'],
  display: 'swap'
});

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
  display: 'swap'
});

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Bookified",
  description: "Transform your books into interactive AI coversations. Upload PDFs, and chat with your books using voice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", ibmPlexSerif.variable, monaSans.variable, "font-sans", inter.variable)}
    >
      <body className="relative font-sans min-h-full flex flex-col">{children}</body>
    </html>
  );
}
