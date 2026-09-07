import { z } from "zod";

import { InputFormatSchema } from "./formats";
import { LIMITS } from "./limits";
import {
  DecodeOptionsSchema,
  EncodeOptionsSchema,
  ToBase64OptionsSchema,
  FromBase64OptionsSchema,
  MAX_RAW_BYTES,
  MAX_BASE64_JSON_BYTES,
} from "./schemas";
export {
  DecodeOptionsSchema,
  EncodeOptionsSchema,
  ToBase64OptionsSchema,
  FromBase64OptionsSchema,
  ValidateOptionsSchema,
  RawChannelsSchema,
  MAX_RAW_BYTES,
  MAX_BASE64_UPLOAD_BYTES,
  MAX_BASE64_JSON_BYTES,
} from "./schemas";
import { RawChannelsSchema } from "./schemas";

export const RawManifestSchema = z.object({
  version: z.literal(1),
  kind: z.literal("raw-pixels"),
  file: z.literal("pixels.raw"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  channels: RawChannelsSchema,
  depth: z.literal("uchar"),
  space: z.literal("srgb"),
  layout: z.literal("interleaved"),
  premultiplied: z.literal(false),
  stride: z.number().int().positive(),
  bytes: z.number().int().positive().max(MAX_RAW_BYTES),
});
export const Base64ResultSchema = z.object({
  format: InputFormatSchema,
  contentType: z.string().regex(/^image\/[a-z0-9.+-]+$/),
  bytes: z.number().int().positive().max(LIMITS.maxUploadBytes),
  encoding: z.enum(["base64", "data-url"]),
  data: z.string().min(1).max(MAX_BASE64_JSON_BYTES),
});
export const ValidationResultSchema = z.object({
  valid: z.literal(true),
  format: InputFormatSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  channels: z.number().int().positive(),
  hasAlpha: z.boolean(),
  bytes: z.number().int().positive().max(LIMITS.maxUploadBytes),
});

export type DecodeOptions = z.infer<typeof DecodeOptionsSchema>;
export type EncodeOptions = z.infer<typeof EncodeOptionsSchema>;
export type ToBase64Options = z.infer<typeof ToBase64OptionsSchema>;
export type FromBase64Options = z.infer<typeof FromBase64OptionsSchema>;
