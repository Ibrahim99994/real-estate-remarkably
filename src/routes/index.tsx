import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Copy,
  Home,
  ImagePlus,
  Loader2,
  Quote,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
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
import heroHome from "@/assets/hero-home.jpg";

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

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Home className="size-5" />
      </div>
      <div>
        <p className="text-base font-semibold tracking-tight text-foreground">ListingCraft</p>
        <p className="text-xs text-muted-foreground">AI listing copy for real estate agents</p>
      </div>
    </div>
  );
}

/* ---------------------------------- Landing ---------------------------------- */

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur">
              <Home className="size-5" />
            </div>
            <p className="text-base font-semibold tracking-tight text-white">ListingCraft</p>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroHome}
          alt="Modern luxury home at dusk with glowing windows"
          width={1920}
          height={1080}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/55 to-background" />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 pb-28 pt-36 text-center sm:pt-44">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-white backdrop-blur">
            <Sparkles className="size-3.5" />
            Built for busy agents
          </span>
          <h1 className="mt-7 max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Photos in. Listing copy out.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
            Turn a few photos and property basics into an MLS-ready description, highlight
            bullets, and captions for Instagram, Facebook and LinkedIn — in under a minute.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 bg-white px-8 text-base font-semibold text-slate-900 shadow-xl shadow-black/30 hover:bg-white/90"
            >
              <Link to="/auth">
                Start writing listings — $29/mo
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="text-sm text-white/60">Cancel any time. No per-listing fees.</p>
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            From rough notes to ready-to-post
          </h2>
          <p className="mt-4 text-muted-foreground">
            This is a real example of what ListingCraft produces from the details you'd jot down
            after a walkthrough.
          </p>
        </div>

        <div className="relative mt-14 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {/* Before */}
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              What you type in
            </p>
            <ul className="mt-5 space-y-3 font-mono text-sm leading-relaxed text-muted-foreground">
              <li>128 Maple Ave, Austin TX</li>
              <li>$749,000 · 4 bd · 2.5 ba · 2,140 sqft</li>
              <li>renovated kitchen, quartz counters</li>
              <li>corner lot, new roof 2024</li>
              <li>walkable to downtown</li>
            </ul>
            <p className="mt-6 text-xs italic text-muted-foreground/70">
              ~30 seconds of typing, plus a few photos
            </p>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Sparkles className="size-5" />
            </div>
          </div>

          {/* After */}
          <div className="rounded-2xl border border-border bg-card p-7 shadow-xl shadow-primary/5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              What you get back
            </p>
            <p className="mt-5 font-display text-lg font-semibold leading-snug text-card-foreground">
              "Sun-drenched corner-lot stunner with a chef's renovated kitchen, steps from
              downtown Austin."
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Welcome to 128 Maple Ave — a beautifully updated 4-bedroom, 2.5-bath home on a
              generous corner lot. The renovated kitchen shines with quartz counters and
              stainless appliances, while a brand-new roof (2024) means worry-free living for
              years to come…
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["MLS description", "Instagram caption", "Facebook post", "LinkedIn post", "Hashtags"].map(
                (chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {chip}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Three steps. Sixty seconds.
          </h2>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {[
              {
                icon: ClipboardList,
                step: "1",
                title: "Enter the details",
                text: "Address, price, beds, baths, plus up to 6 photos and your quick notes from the walkthrough.",
              },
              {
                icon: Sparkles,
                step: "2",
                title: "AI writes it",
                text: "ListingCraft studies the photos and your notes, then writes accurate, fair-housing-safe copy in your chosen tone.",
              },
              {
                icon: Share2,
                step: "3",
                title: "Copy & post",
                text: "One click copies your MLS description, highlight bullets, and ready-to-post social captions.",
              },
            ].map(({ icon: Icon, step, title, text }) => (
              <div key={step} className="relative rounded-2xl border border-border bg-card p-8">
                <span className="absolute right-6 top-6 font-display text-5xl font-semibold text-muted">
                  {step}
                </span>
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-card-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Quote className="mx-auto size-8 text-primary" />
        <blockquote className="mt-6 font-display text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-3xl">
          "I used to lose an hour per listing writing descriptions and posts. Now it's done before
          I leave the driveway."
        </blockquote>
        <p className="mt-6 text-sm font-medium text-foreground">Marcus T.</p>
        <p className="text-sm text-muted-foreground">Residential agent, 12 listings/month</p>
      </section>

      {/* Pricing / CTA */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-10 text-center shadow-2xl shadow-primary/10">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Simple pricing
            </p>
            <p className="mt-4 font-display text-6xl font-semibold tracking-tight text-foreground">
              $29
              <span className="text-xl font-normal text-muted-foreground">/month</span>
            </p>
            <ul className="mt-8 space-y-3 text-left text-sm text-card-foreground">
              {[
                "Unlimited MLS-ready listing descriptions",
                "Instagram, Facebook and LinkedIn captions",
                "Photo-aware highlights and hashtags",
                "Fair-housing-safe, never invents features",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              className="mt-9 h-12 w-full text-base font-semibold shadow-lg shadow-primary/30"
            >
              <Link to="/auth">
                Create your account
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Secure card payment · 30 days of access · cancel any time
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Logo />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ListingCraft. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------- App ---------------------------------- */

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

function Generator({ variant }: { variant: "free" | "pro" }) {
  const generatePro = useServerFn(generateListing);
  const generateFree = useServerFn(generateListingFree);
  const fileRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [highlights, setHighlights] = useState("");
  const [tone, setTone] = useState("professional");
  const [freeUsed, setFreeUsed] = useState(false);

  useEffect(() => {
    if (variant === "free" && localStorage.getItem("lc_free_used") === "1") setFreeUsed(true);
  }, [variant]);

  const mutation = useMutation<ListingResult>({
    mutationFn: () => {
      const payload = { data: { address, price, beds, baths, sqft, highlights, tone, photos } };
      return (variant === "free" ? generateFree(payload) : generatePro(payload)) as Promise<ListingResult>;
    },
    onSuccess: () => {
      if (variant === "free") {
        localStorage.setItem("lc_free_used", "1");
        setFreeUsed(true);
      }
    },
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
    if (variant === "free" && freeUsed) {
      toast.error("You've used your free listing — sign up for unlimited generations.");
      return;
    }
    if (!address.trim() || !price.trim() || !beds.trim() || !baths.trim()) {
      toast.error("Address, price, beds and baths are required");
      return;
    }
    mutation.mutate();
  }

  const result = mutation.data;
  const locked = variant === "free" && freeUsed;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
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

        {locked ? (
          <Button asChild size="lg" className="h-12 w-full text-base font-semibold shadow-lg shadow-primary/30">
            <Link to="/auth">
              Sign up for $29/month
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                {variant === "free" ? "Generate my free listing" : "Generate listing copy"}
              </>
            )}
          </Button>
        )}
        {variant === "free" && !locked && (
          <p className="text-center text-xs text-muted-foreground">
            No account, no card. One free listing on us.
          </p>
        )}
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
            {variant === "free" && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
                <p className="font-display text-xl font-semibold tracking-tight text-foreground">
                  Like what you see?
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sign up for $29/month to generate unlimited listings.
                </p>
                <Button asChild size="lg" className="mt-5 h-12 px-8 text-base font-semibold shadow-lg shadow-primary/30">
                  <Link to="/auth">
                    Sign up for $29/month
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            )}
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
  );
}

function HomePage() {
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

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Toaster />
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <Toaster />
        <LandingPage />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo />
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {billing.isLoading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !billing.data?.active ? (
          <Paywall
            email={session.email}
            onSignOut={() => {
              supabase.auth.signOut();
            }}
          />
        ) : (
          <Generator variant="pro" />
        )}
      </main>
    </div>
  );
}
