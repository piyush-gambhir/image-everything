import type { z, ZodTypeAny } from "zod";

import { ProblemException, problem } from "@/shared/problem";

export function parseOptions<T extends ZodTypeAny>(
  raw: string | undefined,
  schema: T,
): z.infer<T> {
  if (raw === undefined || raw === "") {
    const result = schema.safeParse({});
    if (!result.success) {
      throw invalidOptions(result.error.issues);
    }
    return result.data;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ProblemException(
      problem({
        status: 422,
        code: "INVALID_OPTIONS",
        detail: 'The multipart "options" field must contain valid JSON.',
        errors: [{ path: "options", message: "Invalid JSON" }],
      }),
    );
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw invalidOptions(result.error.issues);
  }
  return result.data;
}

function invalidOptions(issues: z.core.$ZodIssue[]): ProblemException {
  return new ProblemException(
    problem({
      status: 422,
      code: "INVALID_OPTIONS",
      detail: "The options field does not match the operation schema.",
      errors: issues.slice(0, 100).map((issue) => ({
        path:
          issue.path.length > 0
            ? issue.path.map((segment) => String(segment)).join(".")
            : "options",
        message: issue.message,
      })),
    }),
  );
}
