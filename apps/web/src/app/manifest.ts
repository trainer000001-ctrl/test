import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "A-L-L-A-H.COM — Empire of the Light",
    short_name: "A-L-L-A-H.COM",
    description:
      "Neutral monocentric sanctuary uniting four revealed witness traditions (Taurat, Zabur, Injīl, Al-Qur’ān), explainable M-Time calendrics, and accountable craft.",
    start_url: "/",
    display: "standalone",
    background_color: "#040509",
    theme_color: "#dfc07b",
    orientation: "any",
    categories: ["education", "reference", "books"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
