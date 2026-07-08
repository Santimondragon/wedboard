import { InvitationNotFound } from "@/components/public-invitation/invitation-not-found";

// Custom-domain catch-all: the root and any path other than
// /invitations/{slug} shows a branded not-found page instead of the
// Wedboard marketing site.
export default function Page() {
  return <InvitationNotFound />;
}
