import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://a-l-l-a-h.com";
  const lastModified = new Date("2026-11-16T00:00:00Z");

  return [
    { url: `${baseUrl}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/scriptures`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/codex`, lastModified, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/mtime`, lastModified, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/moonwitness`, lastModified, changeFrequency: "weekly", priority: 0.85 },
  ];
}
