import { NoObjectGeneratedError, Output, streamText } from "ai";
import type { z } from "zod";
import { createLovableAiGatewayProvider } from "../ai-gateway.server";

/** Runs a structured gateway call, degrading to raw-text JSON parsing when validation fails. */
export async function runStructured<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
): Promise<T> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");
  const gateway = createLovableAiGatewayProvider(key);

  const { z } = await import("zod");
  const jsonShape = JSON.stringify(z.toJSONSchema(schema as never));

  const result = streamText({
    model: gateway("google/gemini-2.5-flash"),
    output: Output.object({ schema }),
    system: `${system}\n\nReply with a single JSON object matching exactly this JSON schema — every property is required, no extra properties, no markdown fences:\n${jsonShape}`,
    prompt,
  });

  try {
    return await result.output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const raw = error.text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end > start) {
        const parsed = schema.safeParse(JSON.parse(raw.slice(start, end + 1)));
        if (parsed.success) return parsed.data;
      }
    }
    throw error;
  }
}

export function toList(value: string): string[] {
  return value
    .split(/\n|;|·|\u2022|,(?=\s*[A-Z])/)
    .map((s) => s.replace(/^[-–•\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}
