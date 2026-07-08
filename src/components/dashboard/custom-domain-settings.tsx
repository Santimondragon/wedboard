"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Id } from "convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
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
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-medium text-zinc-900">Custom Domain</h2>
        {isLive && (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            Live
          </Badge>
        )}
        {isPending && (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            Waiting for DNS
          </Badge>
        )}
      </div>

      {!customDomain && (
        <>
          <p className="text-sm text-zinc-500">
            Serve your invitations from your own domain. Enter a domain you
            already own — we&apos;ll walk you through the rest.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="customDomain">Domain</Label>
            <Input
              id="customDomain"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="invites.mywedding.com"
              className="font-mono text-sm"
            />
          </div>
          <Button
            onClick={handleConnect}
            disabled={connecting}
            variant="outline"
          >
            {connecting ? "Connecting..." : "Connect Domain"}
          </Button>
        </>
      )}

      {customDomain && (
        <div className="rounded-md border border-zinc-200 p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium font-mono truncate">
                {customDomain}
              </p>
              <p className="text-xs text-zinc-500 font-mono">
                https://{customDomain}/invitations/...
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
                </a>
              </Button>
            )}
          </div>

          {isPending && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">
                One more step: sign in to the website where you bought your
                domain (GoDaddy, Namecheap, Cloudflare, ...), find its{" "}
                <span className="font-medium">DNS settings</span>, and add the
                record{dnsRecords && dnsRecords.length > 1 ? "s" : ""} below.
                Then come back and check the status — changes can take a few
                minutes to a few hours to take effect.
              </p>
              {dnsRecords === null ? (
                <p className="text-sm text-zinc-400">Loading DNS records...</p>
              ) : (
                <div className="space-y-2">
                  {dnsRecords.map((record, i) => (
                    <div
                      key={i}
                      className="rounded-md bg-zinc-50 border border-zinc-200 p-3 space-y-2"
                    >
                      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-xs text-zinc-400 uppercase">
                          Type
                        </span>
                        <span className="font-mono">{record.type}</span>
                        <span />
                        <span className="text-xs text-zinc-400 uppercase">
                          Name
                        </span>
                        <span className="font-mono break-all">
                          {record.name}
                        </span>
                        <CopyButton text={record.name} />
                        <span className="text-xs text-zinc-400 uppercase">
                          Value
                        </span>
                        <span className="font-mono break-all">
                          {record.value}
                        </span>
                        <CopyButton text={record.value} />
                      </div>
                      {record.type === "TXT" && (
                        <p className="text-xs text-amber-700">
                          This TXT record proves you own the domain — it&apos;s
                          required because the domain is registered elsewhere.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={handleCheckStatus}
              disabled={checking}
              variant="outline"
              size="sm"
            >
              {checking ? "Checking..." : "Check Status"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  disabled={removing}
                >
                  {removing ? "Removing..." : "Remove Domain"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Custom Domain</AlertDialogTitle>
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
                    className="bg-rose-600 hover:bg-rose-700"
                  >
                    Remove Domain
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </section>
  );
}
