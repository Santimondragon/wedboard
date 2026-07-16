"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { LoadingState } from "@/components/app/loading-state";
import { InvitationNotFound } from "./invitation-not-found";
import { TemplateThemeProvider } from "./template-theme";
import { ElegantFrame } from "./templates/elegant";
import {
  ElegantSection,
  WeddingButton,
  coupleNames,
  formatDate,
  mapHref,
  pad,
  useRemaining,
} from "./templates/elegant/blocks/primitives";
import { DEFAULT_TEMPLATE_ID } from "./templates/template-registry";

/**
 * Landing page for the ROOT of a custom domain (https://{customDomain}/).
 * Shows a countdown to the event plus the couple names / date / venue,
 * styled like the elegant template. Guests still RSVP via their personal
 * /invitations/{slug} link — this page is intentionally read-only.
 */
export function EventLanding({ host }: { host: string }) {
  const event = useQuery(api.events.getPublicEventByHost, { host });

  if (event === undefined) return <LoadingState />;
  if (event === null) return <InvitationNotFound />;

  const [first, second] = coupleNames(event);

  return (
    <TemplateThemeProvider templateId={DEFAULT_TEMPLATE_ID}>
      <ElegantFrame>
        <ElegantSection className="flex min-h-screen flex-col items-center justify-center gap-8 py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            {event.date ? (
              <p className="font-script text-xl text-wedding-ink">
                {formatDate(event.date)}
              </p>
            ) : null}
            <h1 className="font-script text-[48px] leading-[1.05] text-wedding-gold text-balance">
              {first && second ? (
                <>
                  {first} &amp; {second}
                </>
              ) : (
                event.name
              )}
            </h1>
          </div>

          <Countdown date={event.date} />

          {event.venueName || event.venueAddress ? (
            <div className="flex flex-col items-center gap-4">
              {event.venueName ? (
                <p className="font-elegant text-xl font-bold text-wedding-ink">
                  {event.venueName}
                </p>
              ) : null}
              {event.venueAddress ? (
                <p className="font-elegant text-[16px] leading-relaxed text-wedding-ink">
                  {event.venueAddress}
                </p>
              ) : null}
              {event.venueMapUrl || event.venueAddress ? (
                <WeddingButton
                  href={mapHref(
                    event,
                    event.venueAddress ?? event.venueName ?? "",
                  )}
                >
                  Ver mapa
                </WeddingButton>
              ) : null}
            </div>
          ) : null}
        </ElegantSection>
      </ElegantFrame>
    </TemplateThemeProvider>
  );
}

function Countdown({ date }: { date?: number }) {
  const { days, hours, minutes } = useRemaining(date);
  if (!date) return null;

  // useRemaining clamps at zero, so all-zeros means the date has arrived.
  if (days === 0 && hours === 0 && minutes === 0) {
    return (
      <p className="font-script text-[40px] leading-tight text-wedding-gold">
        ¡Llegó el día!
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="font-script text-[40px] leading-tight text-wedding-gold">
        Faltan
      </h2>
      <p className="font-script text-6xl leading-none text-wedding-ink tabular-nums">
        {pad(days)}:{pad(hours)}:{pad(minutes)}
      </p>
      <div className="grid w-full max-w-50 grid-cols-3 gap-4 font-elegant text-[16px] font-bold text-wedding-ink">
        <span>Días</span>
        <span>Horas</span>
        <span>Min</span>
      </div>
    </div>
  );
}
