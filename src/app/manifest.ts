import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kyorix Athlete ID System - Accreditation Console",
    short_name: "Kyorix ID",
    description: "Official Taekwondo Athlete ID & Accreditation System",
    start_url: "/admin",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
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
        src: "/app-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

