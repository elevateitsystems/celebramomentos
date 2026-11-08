import { describe, expect, it, vi } from "vitest";
import { PRODUCTION_SITE_URL, siteUrl } from "@/lib/server/site-url";

vi.spyOn(console, "warn").mockImplementation(() => undefined);

describe("public site URL for Stripe / PayPal redirects", () => {
  it("never sends production customers to a localhost URL left in the environment", () => {
    expect(siteUrl("https://www.celebra-momentos.com", { VERCEL: "1", VERCEL_ENV: "production", NEXT_PUBLIC_APP_URL: "http://localhost:3000" })).toBe(PRODUCTION_SITE_URL);
    expect(siteUrl("https://celebramomentos.vercel.app", { VERCEL: "1", VERCEL_ENV: "production", NEXT_PUBLIC_APP_URL: "http://localhost:3000" })).toBe("https://www.celebra-momentos.com");
  });

  it("uses the configured public URL when it is a real domain", () => {
    expect(siteUrl("https://x.vercel.app", { VERCEL_ENV: "production", NEXT_PUBLIC_APP_URL: "https://www.celebra-momentos.com/" })).toBe("https://www.celebra-momentos.com");
    expect(siteUrl("https://x.vercel.app", { APP_URL: "https://shop.example", NEXT_PUBLIC_APP_URL: "http://localhost:3000" })).toBe("https://shop.example");
  });

  it("uses the production domain on Vercel production even with nothing configured", () => {
    expect(siteUrl("https://www.celebra-momentos.com", { VERCEL: "1", VERCEL_ENV: "production" })).toBe(PRODUCTION_SITE_URL);
  });

  it("keeps localhost for local development", () => {
    expect(siteUrl("http://localhost:3000", { NEXT_PUBLIC_APP_URL: "http://localhost:3000" })).toBe("http://localhost:3000");
    expect(siteUrl("http://localhost:3001", {})).toBe("http://localhost:3001");
  });

  it("uses the preview's own URL on Vercel previews when the configured URL is localhost", () => {
    expect(siteUrl("https://celebra-git-samin.vercel.app", { VERCEL: "1", VERCEL_ENV: "preview", NEXT_PUBLIC_APP_URL: "http://localhost:3000" })).toBe("https://celebra-git-samin.vercel.app");
  });

  it("ignores garbage values", () => {
    expect(siteUrl("http://localhost:3000", { NEXT_PUBLIC_APP_URL: "not a url ::" })).toBe("http://localhost:3000");
  });
});
