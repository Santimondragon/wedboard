import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "convex/_generated/api";
import { EventLanding } from "@/components/public-invitation/event-landing";
import { InvitationNotFound } from "@/components/public-invitation/invitation-not-found";

type Params = Promise<{ host: string; rest?: string[] }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { host, rest } = await params;
  if (rest && rest.length > 0) return {};
  const event = await fetchQuery(api.events.getPublicEventByHost, {
    host: decodeURIComponent(host),
  }).catch(() => null);
  if (!event) return {};
  const couple =
    event.brideName && event.groomName
      ? `${event.brideName} & ${event.groomName}`
      : event.name;
  return { title: couple, description: `Nuestra boda — ${couple}` };
}

// Custom-domain catch-all: the root shows an event landing page (countdown +
// couple/date/venue); any path other than /invitations/{slug} shows a branded
// not-found page instead of the Wedboard marketing site.
export default async function Page({ params }: { params: Params }) {
  const { host, rest } = await params;
  if (!rest || rest.length === 0) {
    return <EventLanding host={decodeURIComponent(host)} />;
  }
  return <InvitationNotFound />;
}
