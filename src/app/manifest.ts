import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Azviq",
    short_name: "Azviq",
    description: "AI-powered study companion",
    start_url: "/",
    display: "standalone",
    background_color: "#1A1A1A",
    theme_color: "#C2A27A",
    icons: [
      {
        src: "/icon-light.png",
        sizes: "any",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-dark.png",
        sizes: "any",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
