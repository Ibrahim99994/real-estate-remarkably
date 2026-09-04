import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type { ListingResult } from "./listing.server";

const ListingInput = z.object({
  address: z.string().min(3),
  price: z.string().min(1),
  beds: z.string().min(1),
  baths: z.string().min(1),
  sqft: z.string().optional().default(""),
  highlights: z.string().optional().default(""),
  tone: z.enum(["professional", "luxury", "warm", "punchy"]).default("professional"),
  photos: z.array(z.string()).max(6).default([]),
});

const FREE_GENERATIONS = 1;

export const generateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ListingInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", context.userId)
      .maybeSingle();
    const active =
      sub?.status === "active" &&
      !!sub.current_period_end &&
      new Date(sub.current_period_end).getTime() > Date.now();
    if (!active) throw new Error("Your subscription is not active. Please subscribe to generate copy.");

    const { runGeneration } = await import("./listing.server");
    return runGeneration(data);
  });

/**
 * Anonymous trial: one free listing per visitor, enforced server-side.
 */
export const generateListingFree = createServerFn({ method: "POST" })
  .validator((input: unknown) => ListingInput.parse(input))
  .handler(async ({ data }) => {
    const { createHash } = await import("crypto");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runGeneration } = await import("./listing.server");

    const req = getRequest();
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const visitorKey = createHash("sha256")
      .update(`${ip}|${req.headers.get("user-agent") ?? ""}`)
      .digest("hex");

    const { data: row } = await supabaseAdmin
      .from("free_trials")
      .select("uses")
      .eq("visitor_key", visitorKey)
      .maybeSingle();

    if ((row?.uses ?? 0) >= FREE_GENERATIONS) {
      throw new Error(
        "You've used your free listing. Sign up for $29/month to generate unlimited listings.",
      );
    }

    const result = await runGeneration(data);

    await supabaseAdmin
      .from("free_trials")
      .upsert(
        { visitor_key: visitorKey, uses: (row?.uses ?? 0) + 1, updated_at: new Date().toISOString() },
        { onConflict: "visitor_key" },
      );

    return result;
  });
