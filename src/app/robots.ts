import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://azviq.in").trim().replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/about",
        "/contact",
        "/feedback",
        "/privacy",
        "/terms",
        "/login",
        "/signup"
      ],
      disallow: [
        "/dashboard/",
        "/settings/",
        "/library/",
        "/ai/",
        "/preparation/",
        "/tasks/",
        "/trash/",
        "/api/"
      ]
    },
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
