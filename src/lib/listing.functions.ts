import { createServerFn } from "@tanstack/react-start";
import { streamText, Output } from "ai";
import { z } from "zod";

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

const ListingOutput = z.object({
  headline: z.string(),
  mlsDescription: z.string(),
  shortDescription: z.string(),
  bullets: z.array(z.string()),
  instagram: z.string(),
  facebook: z.string(),
  linkedin: z.string(),
  hashtags: z.array(z.string()),
});

export type ListingResult = z.infer<typeof ListingOutput>;

export const generateListing = createServerFn({ method: "POST" })
  .validator((input: unknown) => ListingInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured. Missing LOVABLE_API_KEY.");

    const { createLovableResponsesProvider } = await import("./ai-gateway.server");
    const gateway = createLovableResponsesProvider(key);

    const facts = [
      `Address: ${data.address}`,
      `Price: ${data.price}`,
      `Bedrooms: ${data.beds}`,
      `Bathrooms: ${data.baths}`,
      data.sqft ? `Square feet: ${data.sqft}` : "",
      data.highlights ? `Agent notes: ${data.highlights}` : "",
      `Tone: ${data.tone}`,
    ]
      .filter(Boolean)
      .join("\n");

    const content: Array<
      { type: "text"; text: string } | { type: "image"; image: string }
    > = [
      {
        type: "text",
        text: `Write marketing copy for this property listing. Use the photos (if any) to describe real visible features — never invent features you cannot see or that are not listed.\n\n${facts}\n\nMLS description: 120-180 words, no fair-housing violations, no discriminatory language, no unverifiable claims. Social captions should be platform-appropriate and include a call to action.`,
      },
      ...data.photos.map((p) => ({ type: "image" as const, image: p })),
    ];

    try {
      const result = streamText({
        model: gateway("openai/gpt-5.6-sol"),
        system:
          "You are a top-producing real estate copywriter. You write accurate, compliant, vivid listing copy. Never mention protected classes, schools' quality, or neighborhood demographics.",
        output: Output.object({ schema: ListingOutput }),
        messages: [{ role: "user", content }],
      });
      return (await result.output) as ListingResult;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number; status?: number })?.statusCode ??
        (err as { status?: number })?.status;
      if (status === 429) throw new Error("Rate limited by AI service. Please try again in a moment.");
      if (status === 402) throw new Error("AI credits exhausted. Add credits in Lovable to keep generating.");
      throw new Error(
        err instanceof Error ? err.message : "Generation failed. Please try again.",
      );
    }
  });
