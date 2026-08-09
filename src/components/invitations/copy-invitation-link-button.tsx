"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <Check className="size-4 text-success" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {customDomain
          ? `Copy ${customDomain}/invitations/${slug}`
          : `Copy /${eventSlug}/invitations/${slug}`}
      </TooltipContent>
    </Tooltip>
  );
}
