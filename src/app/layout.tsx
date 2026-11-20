import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Baloo_2, Nunito } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const baloo2 = Baloo_2({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Nấu Emoji — Trộn 147.000+ Sticker & Chế Meme Tiếng Việt",
  description:
    "Phòng bếp trộn 147.000+ sticker emoji siêu độc: tìm tiếng Việt không dấu, quay gacha nhân phẩm, bật viền trắng sticker & chèn chữ trend gửi Zalo/Messenger.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Nấu Emoji",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Nấu Emoji — Phòng Bếp Trộn Sticker Gen Z",
    description:
      "Trộn 147.000+ sticker emoji siêu lầy, chế viền trắng & chữ trend tiếng Việt cực nhanh!",
    url: "/",
    siteName: "Nấu Emoji",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nấu Emoji — Phòng Bếp Trộn 147.000+ Sticker & Chế Meme Tiếng Việt",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nấu Emoji — Phòng Bếp Trộn Sticker Gen Z",
    description:
      "Trộn 147.000+ sticker emoji siêu lầy, chế viền trắng & chữ trend tiếng Việt cực nhanh!",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6B9D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${baloo2.variable} ${nunito.variable}`}>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
      </head>
      <body className="antialiased selection:bg-[#FFD6E5] selection:text-[#2D1D42]">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
