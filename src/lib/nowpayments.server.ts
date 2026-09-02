import { createHmac, timingSafeEqual } from "crypto";

export const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

/** USDT network the payout wallet expects (0x… address → ERC-20). */
export const PAYOUT_CURRENCY = "usdterc20";

export const PLAN_PRICE_USD = 29;
export const PLAN_PERIOD_DAYS = 30;

function apiKey(): string {
  const key = process.env["NOWPAYMENTS_API_KEY"];
  if (!key) throw new Error("Payments are not configured yet (missing NOWPayments API key).");
  return key;
}

export type CreateInvoiceArgs = {
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
};

export async function createInvoice(args: CreateInvoiceArgs): Promise<{
  id: string;
  invoice_url: string;
}> {
  const res = await fetch(`${NOWPAYMENTS_API}/invoice`, {
    method: "POST",
    headers: { "x-api-key": apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: PLAN_PRICE_USD,
      price_currency: "usd",
      pay_currency: PAYOUT_CURRENCY,
      order_id: args.orderId,
      order_description: args.orderDescription,
      ipn_callback_url: args.ipnCallbackUrl,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      is_fixed_rate: true,
      is_fee_paid_by_user: false,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[nowpayments] invoice failed", res.status, text);
    throw new Error(
      res.status === 401
        ? "NOWPayments rejected the API key. Check the key and try again."
        : "Could not start the payment. Please try again.",
    );
  }

  const json = JSON.parse(text) as { id?: string | number; invoice_url?: string };
  if (!json.invoice_url) throw new Error("NOWPayments did not return a payment link.");
  return { id: String(json.id ?? ""), invoice_url: json.invoice_url };
}

/** NOWPayments signs the IPN body as HMAC-SHA512 over JSON with keys sorted alphabetically. */
function sortedStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sortedStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${sortedStringify(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function verifyIpnSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env["NOWPAYMENTS_IPN_SECRET"];
  if (!secret || !signature) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }
  const expected = createHmac("sha512", secret).update(sortedStringify(parsed)).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
