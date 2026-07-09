import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "convex/_generated/api";
import { PublicInvitationPage } from "@/components/public-invitation/public-invitation-page";
import { buildInvitationMetadata } from "@/lib/invitation-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventSlug: string; invitationSlug: string }>;
}): Promise<Metadata> {
  const { eventSlug, invitationSlug } = await params;
  const meta = await fetchQuery(api.meta.getPublicInvitationMeta, {
    eventSlug,
    invitationSlug,
  }).catch(() => null);
  return buildInvitationMetadata(meta);
}

export default async function Page({
  params,
}: {
  params: Promise<{ eventSlug: string; invitationSlug: string }>;
}) {
  const { eventSlug, invitationSlug } = await params;
  return (
    <PublicInvitationPage
      eventSlug={eventSlug}
      invitationSlug={invitationSlug}
    />
  );
}
