// Public base URL of the careers site. Used to build absolute links (e.g.
// interview invitation links) and SEO/OpenGraph metadata. Configure via
// NEXT_PUBLIC_SITE_URL so the value is available on both server and client.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://careers.aalb.org"
).replace(/\/+$/, "");

export const SITE_NAME = "AALB Careers";

// Resolve the base URL at runtime, preferring the configured value but falling
// back to the current browser origin when rendered client-side without env.
export function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return SITE_URL;
}

export function interviewInviteUrl(slug: string): string {
  return `${resolveSiteUrl()}/interview/${slug}`;
}
