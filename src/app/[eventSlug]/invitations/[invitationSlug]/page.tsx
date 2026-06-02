import { PublicInvitationPage } from "@/components/public-invitation/public-invitation-page"

export default async function Page({
  params,
}: {
  params: Promise<{ eventSlug: string; invitationSlug: string }>
}) {
  const { eventSlug, invitationSlug } = await params
  return (
    <PublicInvitationPage eventSlug={eventSlug} invitationSlug={invitationSlug} />
  )
}
