import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s｜${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.shortName }],
  creator: siteConfig.shortName,
  publisher: siteConfig.shortName,
  alternates: {
    canonical: "/",
    languages: { "zh-Hant": "/" },
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} 封面圖`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    creator: siteConfig.twitter,
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "education",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: siteConfig.themeColor },
    { media: "(prefers-color-scheme: dark)", color: "#1f1d1a" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  description: siteConfig.description,
  inLanguage: siteConfig.locale,
  url: siteConfig.url,
  publisher: { "@type": "Organization", name: siteConfig.shortName },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={siteConfig.locale}>
      <body>
        <a className="skip-link" href="#main-content">
          跳至主要內容
        </a>
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          type="application/ld+json"
        />
        {children}
      </body>
    </html>
  );
}