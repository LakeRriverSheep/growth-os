import type { MetadataRoute } from "next";

// PWA 清单：手机「添加到主屏幕」后以独立 App 形态运行
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "I · 电子版的自己",
    short_name: "I",
    description: "AI 辅助的个人成长软件",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
