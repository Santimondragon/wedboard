import type { Metadata } from "next";

export type PublicInvitationMeta = {
  title: string;
  description: string;
  imageUrl: string | null;
  faviconUrl: string | null;
  faviconMimeType: string | null;
} | null;

/**
 * Maps the resolved Convex invitation metadata to a Next.js Metadata object
 * (shared by the primary-domain and custom-domain public routes).
 */
export function buildInvitationMetadata(meta: PublicInvitationMeta): Metadata {
  if (!meta) {
    return { title: "Invitation Not Found" };
  }
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "website",
      ...(meta.imageUrl ? { images: [{ url: meta.imageUrl }] } : {}),
    },
    twitter: {
      card: meta.imageUrl ? "summary_large_image" : "summary",
      title: meta.title,
      description: meta.description,
      ...(meta.imageUrl ? { images: [meta.imageUrl] } : {}),
    },
    ...(meta.faviconUrl
      ? {
          icons: {
            icon: [
              {
                url: meta.faviconUrl,
                ...(meta.faviconMimeType ? { type: meta.faviconMimeType } : {}),
              },
            ],
          },
        }
      : {}),
  };
}
