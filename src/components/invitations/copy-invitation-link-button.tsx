"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyInvitationLinkButtonProps {
  eventSlug: string;
  slug: string;
  customDomain?: string;
}

export function CopyInvitationLinkButton({
  eventSlug,
  slug,
  customDomain,
}: CopyInvitationLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = customDomain
      ? `${window.location.protocol}//${customDomain}/invitations/${slug}`
      : `${window.location.origin}/${eventSlug}/invitations/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy Link"}
    </Button>
  );
}
