import { createFileRoute } from "@tanstack/react-router";

import { verifyIpnSignature, PLAN_PERIOD_DAYS } from "@/lib/nowpayments.server";

const PAID_STATUSES = new Set(["confirmed", "finished", "partially_paid"]);

export const Route = createFileRoute("/api/public/nowpayments-ipn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-nowpayments-sig");

        if (!verifyIpnSignature(rawBody, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: {
          order_id?: string;
          payment_id?: string | number;
          payment_status?: string;
          pay_currency?: string;
        };
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid body", { status: 400 });
        }

        const orderId = payload.order_id;
        const status = payload.payment_status ?? "unknown";
        if (!orderId) return new Response("Missing order_id", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, user_id, status")
          .eq("order_id", orderId)
          .maybeSingle();

        if (!payment) return new Response("Unknown order", { status: 404 });

        await supabaseAdmin
          .from("payments")
          .update({
            status,
            provider_payment_id: payload.payment_id ? String(payload.payment_id) : null,
            pay_currency: payload.pay_currency ?? null,
            raw: payload as never,
          })
          .eq("id", payment.id);

        if (PAID_STATUSES.has(status) && payment.status !== "confirmed" && payment.status !== "finished") {
          const { data: sub } = await supabaseAdmin
            .from("subscriptions")
            .select("current_period_end")
            .eq("user_id", payment.user_id)
            .maybeSingle();

          const existingEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
          const base = existingEnd && existingEnd.getTime() > Date.now() ? existingEnd : new Date();
          const newEnd = new Date(base.getTime() + PLAN_PERIOD_DAYS * 24 * 60 * 60 * 1000);

          await supabaseAdmin.from("subscriptions").upsert(
            {
              user_id: payment.user_id,
              status: "active",
              current_period_end: newEnd.toISOString(),
            },
            { onConflict: "user_id" },
          );
        }

        return new Response("ok");
      },
    },
  },
});
