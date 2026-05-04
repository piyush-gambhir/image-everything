import { BadRequestException } from "@nestjs/common";
import type { z, ZodTypeAny } from "zod";

export function parseOptions<T extends ZodTypeAny>(
  raw: string | undefined,
  schema: T,
): z.infer<T> {
  if (raw === undefined || raw === "") {
    const result = schema.safeParse({});
    if (!result.success) {
      throw new BadRequestException({
        error: "Invalid options",
        issues: result.error.issues,
      });
    }
    return result.data;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException({ error: 'Invalid JSON in "options" field' });
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new BadRequestException({
      error: "Invalid options",
      issues: result.error.issues,
    });
  }
  return result.data;
}
