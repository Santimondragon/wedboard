"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { Panel, StateBlock, StatusPill } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CopyButton } from "@/components/app/copy-button";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  reason?: string;
}

interface CustomDomainSettingsProps {
  eventId: Id<"events">;
  customDomain?: string;
  customDomainVerified?: boolean;
}

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? "Something went wrong";
}

// Guided custom-domain wizard: connect a domain, follow the DNS steps at the
// registrar, check status until live. The Vercel side is fully automated by
// the /api/domains route handlers; the owner never leaves this page.
export function CustomDomainSettings({
  eventId,
  customDomain,
  customDomainVerified,
}: CustomDomainSettingsProps) {
  const [domainInput, setDomainInput] = useState("");
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[] | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isLive = Boolean(customDomain && customDomainVerified);
  const isPending = Boolean(customDomain && !customDomainVerified);

  async function fetchStatus(): Promise<{
    live: boolean;
    dnsRecords: DnsRecord[];
  }> {
    const res = await fetch(
      `/api/domains/status?eventId=${encodeURIComponent(eventId)}`,
    );
    if (!res.ok) {
      throw new Error(await readError(res));
    }
    return (await res.json()) as { live: boolean; dnsRecords: DnsRecord[] };
  }

  async function handleCheckStatus() {
    setChecking(true);
    try {
      const data = await fetchStatus();
      setDnsRecords(data.dnsRecords);
      if (data.live) {
        toast.success("Your domain is live!");
      } else {
        toast.info(
          "Not verified yet — DNS changes can take up to a few hours to propagate",
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to check domain status",
      );
    } finally {
      setChecking(false);
    }
  }

  // After a page reload in the pending state the DNS records are gone (they
  // live in Vercel, not Convex) — fetch them once so the steps stay visible.
  useEffect(() => {
    if (!isPending || dnsRecords !== null) return;
    let cancelled = false;
    fetchStatus()
      .then((data) => {
        if (!cancelled) setDnsRecords(data.dnsRecords);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, dnsRecords]);

  async function handleConnect() {
    if (!domainInput.trim()) {
      toast.error("Enter a domain, e.g. invites.mywedding.com");
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, domain: domainInput }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const data = (await res.json()) as { dnsRecords: DnsRecord[] };
      setDnsRecords(data.dnsRecords);
      setDomainInput("");
      toast.success("Domain connected — now add the DNS records below");
    } catch {
      toast.error("Failed to connect domain");
    } finally {
      setConnecting(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      setDnsRecords(null);
      toast.success("Domain removed");
    } catch {
      toast.error("Failed to remove domain");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Panel
      title="Custom domain"
      description="Serve your invitations from a domain you already own, instead of the standard Wedboard address."
      actions={
        isLive ? (
          <StatusPill tone="success" dot>
            Live
          </StatusPill>
        ) : isPending ? (
          <StatusPill tone="warning" dot>
            Waiting for DNS
          </StatusPill>
        ) : undefined
      }
    >
      {/* Step 1 — no domain connected yet. */}
      {!customDomain && (
        <div className="max-w-md space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="customDomain">Domain</Label>
            <Input
              id="customDomain"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="invites.mywedding.com"
              className="font-mono"
            />
            <p className="text-caption text-muted-foreground">
              Enter a domain you already own — we&apos;ll walk you through the
              DNS setup.
            </p>
          </div>
          <Button onClick={handleConnect} disabled={connecting}>
            <Globe className="mr-1 size-4" aria-hidden />
            {connecting ? "Connecting…" : "Connect domain"}
          </Button>
        </div>
      )}

      {customDomain && (
        <div className="space-y-6">
          {/* The domain itself, and where it points. */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-secondary/60 px-5 py-4">
            <div className="min-w-0">
              <p className="text-body truncate font-mono font-medium text-foreground">
                {customDomain}
              </p>
              <p className="text-caption truncate font-mono text-muted-foreground">
                https://{customDomain}/invitations/…
              </p>
            </div>
            {isLive && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://${customDomain}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit
                  <ExternalLink className="ml-1 size-3.5" aria-hidden />
                </a>
              </Button>
            )}
          </div>

          {/* Step 2 — DNS records still pending at the registrar. */}
          {isPending && (
            <div className="space-y-4">
              <p className="text-body text-muted-foreground">
                One more step: sign in where you bought your domain (GoDaddy,
                Namecheap, Cloudflare, …), open its{" "}
                <span className="font-medium text-foreground">
                  DNS settings
                </span>
                , and add the record
                {dnsRecords && dnsRecords.length > 1 ? "s" : ""} below. Then
                come back and check the status — changes can take a few minutes
                to a few hours to take effect.
              </p>

              {dnsRecords === null ? (
                <StateBlock
                  kind="loading"
                  title="Fetching your DNS records…"
                  compact
                />
              ) : (
                <ul className="space-y-3">
                  {dnsRecords.map((record, i) => (
                    <li
                      key={i}
                      className="overflow-hidden rounded-lg border border-border bg-card shadow-soft-xs"
                    >
                      <dl className="divide-y divide-border">
                        <DnsRow label="Type" value={record.type} />
                        <DnsRow label="Name" value={record.name} copyable />
                        <DnsRow label="Value" value={record.value} copyable />
                      </dl>
                      {record.type === "TXT" && (
                        <p className="text-caption flex items-start gap-2 border-t border-border bg-warning-soft px-4 py-3 text-warning-foreground">
                          <ShieldCheck
                            className="mt-0.5 size-3.5 shrink-0"
                            aria-hidden
                          />
                          <span>
                            This TXT record proves you own the domain — required
                            because it is registered elsewhere.
                          </span>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Step 3 — live: nothing left to do but keep the controls handy. */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleCheckStatus}
              disabled={checking}
              variant="outline"
              size="sm"
            >
              {checking ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="mr-1 size-3.5" aria-hidden />
              )}
              {checking ? "Checking…" : "Check status"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger-soft hover:text-danger"
                  disabled={removing}
                >
                  {removing ? "Removing…" : "Remove domain"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove custom domain</AlertDialogTitle>
                  <AlertDialogDescription>
                    Invitation links on {customDomain} will stop working. Guests
                    can still use the standard links. You can reconnect the
                    domain at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemove}
                    className="bg-danger text-danger-foreground hover:bg-danger/90"
                  >
                    Remove domain
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </Panel>
  );
}

/** One label/value line of a DNS record, with an optional copy affordance. */
function DnsRow({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5">
      <dt className="text-caption w-14 shrink-0 font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-body min-w-0 flex-1 font-mono break-all text-foreground">
        {value}
      </dd>
      {copyable && <CopyButton text={value} />}
    </div>
  );
}
