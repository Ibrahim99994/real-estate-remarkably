import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Home, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateListing, type ListingResult } from "@/lib/listing.functions";
import { createSubscriptionCheckout, getBillingStatus } from "@/lib/billing.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ListingCraft — AI Listing Descriptions for Real Estate Agents" },
      {
        name: "description",
        content:
          "Upload property photos, add the basics, and get MLS-ready listing descriptions plus Instagram, Facebook and LinkedIn captions in seconds.",
      },
      { property: "og:title", content: "ListingCraft — AI Listing Descriptions for Agents" },
      {
        property: "og:description",
        content:
          "Turn photos and a few details into polished listing copy and social captions in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const MAX_PHOTOS = 6;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

function CopyBlock({
  title,
  text,
  className = "",
}: {
  title: string;
  text: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(text);
            toast.success(`${title} copied`);
          }}
        >
          <Copy className="size-4" />
          Copy
        </Button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">{text}</p>
    </div>
  );
}

function Paywall({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const checkout = useServerFn(createSubscriptionCheckout);
  const startCheckout = useMutation({
    mutationFn: () => checkout({}) as Promise<{ url: string }>,
    onSuccess: (d) => {
      window.location.href = d.url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">Signed in as {email}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        ListingCraft Pro — $29/month
      </h2>
      <ul className="mt-6 space-y-2 text-left text-sm text-card-foreground">
        {[
          "Unlimited MLS-ready listing descriptions",
          "Instagram, Facebook and LinkedIn captions",
          "Photo-aware highlights and hashtags",
          "Pay by credit or debit card — 30 days of access",
        ].map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-7 w-full"
        onClick={() => startCheckout.mutate()}
        disabled={startCheckout.isPending}
      >
        {startCheckout.isPending && <Loader2 className="size-4 animate-spin" />}
        Pay $29 by card
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">
        Card payments are processed by NOWPayments and settled in USDT.
      </p>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-5 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Sign out
      </button>
    </div>
  );
}

function HomePage() {
  const generate = useServerFn(generateListing);
  const fileRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<{ email: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ? { email: data.session.user.email ?? "" } : null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ? { email: s.user.email ?? "" } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const billing = useQuery({
    queryKey: ["billing", session?.email],
    enabled: !!session,
    refetchInterval: (q) => (q.state.data?.active ? false : 15000),
    queryFn: () => getBillingStatus() as Promise<{ active: boolean }>,
  });


  const [photos, setPhotos] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [highlights, setHighlights] = useState("");
  const [tone, setTone] = useState("professional");

  const mutation = useMutation<ListingResult>({
    mutationFn: () =>
      generate({
        data: { address, price, beds, baths, sqft, highlights, tone, photos },
      }) as Promise<ListingResult>,
    onError: (e: Error) => toast.error(e.message),
  });

  async function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${MAX_PHOTOS} photos`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    const urls = await Promise.all(picked.map(fileToDataUrl));
    setPhotos((p) => [...p, ...urls]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || !price.trim() || !beds.trim() || !baths.trim()) {
      toast.error("Address, price, beds and baths are required");
      return;
    }
    mutation.mutate();
  }

  const result = mutation.data;

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Home className="size-5" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">ListingCraft</p>
            <p className="text-xs text-muted-foreground">
              Listing copy &amp; social captions for real estate agents
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Photos in, listing copy out.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Add a few photos and the basics. Get an MLS-ready description, highlight bullets, and
          captions for Instagram, Facebook and LinkedIn.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div>
              <Label className="mb-2 block">Property photos</Label>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((src, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={src} alt={`Property photo ${i + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 rounded-md bg-background/80 p-1 text-foreground opacity-0 transition group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition hover:bg-accent"
                  >
                    <ImagePlus className="size-5" />
                    <span className="text-xs">Add</span>
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  onPickPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="128 Maple Ave, Austin, TX"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price">Price</Label>
                <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$749,000" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="sqft">Square feet</Label>
                <Input id="sqft" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="2,140" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="beds">Beds</Label>
                <Input id="beds" value={beds} onChange={(e) => setBeds(e.target.value)} placeholder="4" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="baths">Baths</Label>
                <Input id="baths" value={baths} onChange={(e) => setBaths(e.target.value)} placeholder="2.5" className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="warm">Warm &amp; friendly</SelectItem>
                  <SelectItem value="punchy">Short &amp; punchy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="highlights">Notes / highlights</Label>
              <Textarea
                id="highlights"
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                placeholder="Renovated kitchen, corner lot, new roof 2024, walkable to downtown"
                className="mt-1.5 min-h-24"
              />
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate listing copy
                </>
              )}
            </Button>
          </form>

          <section aria-live="polite" className="space-y-4">
            {!result && !mutation.isPending && (
              <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center">
                <Sparkles className="size-6 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Your listing description and captions will appear here.
                </p>
              </div>
            )}

            {mutation.isPending && (
              <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-border p-10 text-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Writing your listing copy…</p>
              </div>
            )}

            {result && (
              <>
                <CopyBlock title="Headline" text={result.headline} />
                <CopyBlock title="MLS description" text={result.mlsDescription} />
                <CopyBlock title="Short description" text={result.shortDescription} />
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Highlights
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(result.bullets.map((b) => `• ${b}`).join("\n"));
                        toast.success("Highlights copied");
                      }}
                    >
                      <Copy className="size-4" />
                      Copy
                    </Button>
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-card-foreground">
                    {result.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <CopyBlock title="Instagram" text={result.instagram} />
                  <CopyBlock title="Facebook" text={result.facebook} />
                  <CopyBlock title="LinkedIn" text={result.linkedin} className="md:col-span-2" />
                </div>
                <CopyBlock title="Hashtags" text={result.hashtags.join(" ")} />
              </>
            )}
          </section>
        </div>
        )}
      </main>
    </div>
  );
}
