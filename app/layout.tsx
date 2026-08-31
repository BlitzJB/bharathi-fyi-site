import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bharathi.fyi"),
  title: {
    default: "Joshua Bharathi — Platform engineer turned AI engineer",
    template: "%s — Joshua Bharathi",
  },
  description:
    "Platform engineer turned AI engineer. Event pipelines and zero-downtime migrations yesterday; agents, evals, and LLM systems today.",
  openGraph: {
    siteName: "bharathi.fyi",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div className="grain" aria-hidden />
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
