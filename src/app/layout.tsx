import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import Analytics from "@/components/Analytics";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://roast-my-x-theta.vercel.app";

const title = "Roast My X — Get roasted. Then get better.";
const description =
  "Witty, specific AI roasts of your website, resume, pitch deck, or GitHub repo — as a shareable card, plus optional real feedback.";

const ogImageUrl = `${siteUrl}/og-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "Roast My X",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Roast My X",
    title,
    description,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Roast My X — Get roasted. Then get better.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <Analytics />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
