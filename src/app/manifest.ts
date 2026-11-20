import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nấu Emoji — Trộn Emoji & Chế Sticker Meme",
    short_name: "Nấu Emoji",
    description:
      "Phòng bếp trộn 147.000+ sticker emoji độc lạ, tìm kiếm tiếng Việt và chế meme gửi Zalo/Messenger cực nhanh.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFF9F0",
    theme_color: "#FF6B9D",
    lang: "vi",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
