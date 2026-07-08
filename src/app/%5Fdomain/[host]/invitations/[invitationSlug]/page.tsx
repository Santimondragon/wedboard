import { PublicInvitationPage } from "@/components/public-invitation/public-invitation-page";

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
