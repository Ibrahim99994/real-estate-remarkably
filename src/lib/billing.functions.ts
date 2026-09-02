import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Stable public URL used for the NOWPayments IPN callback. */
const PUBLIC_BASE_URL = "https://project--fe412ca7-43cc-46ae-9bfa-cd35b38233ab.lovable.app";

export type BillingStatus = {
  active: boolean;
  status: string;
  currentPeriodEnd: string | null;
};

export const getBillingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingStatus> => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", context.userId)
      .maybeSingle();

    const end = data?.current_period_end ?? null;
    const active = data?.status === "active" && !!end && new Date(end).getTime() > Date.now();
    return { active, status: data?.status ?? "inactive", currentPeriodEnd: end };
  });

export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const { createInvoice, PLAN_PRICE_USD } = await import("./nowpayments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const origin = (() => {
      try {
        return new URL(getRequest().url).origin;
      } catch {
        return PUBLIC_BASE_URL;
      }
    })();

    const orderId = `sub_${context.userId.slice(0, 8)}_${Date.now()}`;

    const invoice = await createInvoice({
      orderId,
      orderDescription: "ListingCraft Pro — 30 days of access",
      ipnCallbackUrl: `${PUBLIC_BASE_URL}/api/public/nowpayments-ipn`,
      successUrl: `${origin}/?payment=success`,
      cancelUrl: `${origin}/?payment=cancelled`,
    });

    const { error } = await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      order_id: orderId,
      invoice_id: invoice.id,
      amount_usd: PLAN_PRICE_USD,
      status: "pending",
      invoice_url: invoice.invoice_url,
    });
    if (error) {
      console.error("[billing] could not record payment", error);
      throw new Error("Could not start the payment. Please try again.");
    }

    return { url: invoice.invoice_url };
  });
