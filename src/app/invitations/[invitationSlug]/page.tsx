import { PublicInvitationPage } from "@/components/public-invitation/public-invitation-page"

export default function Page({ params }: { params: { invitationSlug: string } }) {
  return <PublicInvitationPage slug={params.invitationSlug} />
}
