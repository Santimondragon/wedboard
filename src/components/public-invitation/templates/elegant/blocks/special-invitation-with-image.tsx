"use client";

import { useState } from "react";
import { ElegantSection, FullWidthPhoto, WeddingButton } from "./primitives";
import {
  SpecialEventDetails,
  SpecialInvitationDialog,
  type SpecialCardProps,
} from "./special-invitation-dialog";

/**
 * "With image" special-invitation display template: a full-width 16/10 photo
 * above the event name/description and the same RSVP modal button used by the
 * elegant card (label switches before/after confirmation via `buttonLabel`).
 */
export function WithImageSpecialCard({
  name,
  description,
  buttonLabel,
  canConfirm,
  image,
  guests,
  specialEvent,
  eventSlug,
  invitationSlug,
}: SpecialCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <FullWidthPhoto src={image} alt={name} />
      <ElegantSection className="flex flex-col items-center gap-6 py-10 text-center">
        <h2 className="font-script text-5xl leading-tight text-wedding-gold text-balance">
          {name}
        </h2>
        <p className="whitespace-pre-line font-elegant text-[16px] leading-relaxed text-wedding-ink">
          {description}
        </p>
        <SpecialEventDetails specialEvent={specialEvent} />
        <WeddingButton onClick={() => setOpen(true)} disabled={!canConfirm}>
          {buttonLabel}
        </WeddingButton>
      </ElegantSection>

      {specialEvent && (
        <SpecialInvitationDialog
          open={open}
          onOpenChange={setOpen}
          guests={guests}
          specialEvent={specialEvent}
          eventSlug={eventSlug}
          invitationSlug={invitationSlug}
        />
      )}
    </>
  );
}
