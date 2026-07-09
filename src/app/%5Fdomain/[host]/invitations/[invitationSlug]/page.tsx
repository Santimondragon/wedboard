import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "convex/_generated/api";
import { PublicInvitationPage } from "@/components/public-invitation/public-invitation-page";
import { buildInvitationMetadata } from "@/lib/invitation-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string; invitationSlug: string }>;
}): Promise<Metadata> {
  const { host, invitationSlug } = await params;
  const meta = await fetchQuery(api.meta.getPublicInvitationMeta, {
    host: decodeURIComponent(host),
    invitationSlug,
  }).catch(() => null);
  return buildInvitationMetadata(meta);
}

// Internal target of the middleware Host rewrite: a public invitation served
// on a customer's custom domain. The folder is named %5Fdomain (URL-encoded
// underscore) because plain _domain would be a private, non-routable folder.
export default async function Page({
  params,
}: {
  params: Promise<{ host: string; invitationSlug: string }>;
}) {
  const { host, invitationSlug } = await params;
  return (
    <PublicInvitationPage
      host={decodeURIComponent(host)}
      invitationSlug={invitationSlug}
    />
  );
}
