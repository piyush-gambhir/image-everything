import type { ToolId } from "./registry";
import { getToolOptionsSchema } from "./registry";

export const V1_OPERATION_IDS = [
  "metadata",
  "clean",
  "compress",
  "resize",
  "convert",
  "crop",
  "rotate",
  "watermark",
  "auto-enhance",
  "transform",
  "batch",
] as const;

export type V1OperationId = (typeof V1_OPERATION_IDS)[number];

export type V1OperationMapping = Readonly<{
  toolId: ToolId;
  v2Route: string;
  v2Path: string;
  translateOptions: (options: unknown) => unknown;
}>;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function translateClean(value: unknown): unknown {
  const input = asRecord(value);
  const keep = Array.isArray(input.keep) ? input.keep : [];
  const preserve = keep.flatMap((entry) => {
    if (entry === "orientation") return ["orientation"];
    if (entry === "colorProfile") return ["icc"];
    return [];
  });
  return preserve.length > 0
    ? { policy: "preserve-selected", preserve }
    : { policy: "privacy", preserve: [] };
}

function translateCompress(value: unknown): unknown {
  const input = asRecord(value);
  return {
    format: input.format ?? "auto",
    quality: input.quality ?? 80,
    lossless: input.lossless ?? false,
    mozjpeg: input.mozjpeg ?? true,
  };
}

function translateResize(value: unknown): unknown {
  const input = asRecord(value);
  const allowedPositions = new Set([
    "center",
    "top",
    "right top",
    "right",
    "right bottom",
    "bottom",
    "left bottom",
    "left",
    "left top",
    "entropy",
    "attention",
  ]);
  return {
    width: input.width,
    height: input.height,
    fit: input.fit ?? "cover",
    position:
      typeof input.position === "string" && allowedPositions.has(input.position)
        ? input.position
        : "center",
    background: input.background ?? "#00000000",
    withoutEnlargement: input.withoutEnlargement ?? false,
  };
}

function translateConvert(value: unknown): unknown {
  const input = asRecord(value);
  return {
    format: input.targetFormat ?? input.format,
    quality: input.quality ?? 80,
    background: input.background ?? "#ffffff",
  };
}

function translateCrop(value: unknown): unknown {
  const input = asRecord(value);
  return {
    mode: "rectangle",
    left: input.left,
    top: input.top,
    width: input.width,
    height: input.height,
  };
}

function translateRotate(value: unknown): unknown {
  const input = asRecord(value);
  return {
    angle: input.angle ?? 0,
    flipHorizontal: input.flipH ?? input.flipHorizontal ?? false,
    flipVertical: input.flipV ?? input.flipVertical ?? false,
    background: input.background ?? "#00000000",
  };
}

function translateWatermark(value: unknown): unknown {
  const input = asRecord(value);
  const padding = typeof input.padding === "number" ? input.padding : 24;
  if (input.kind === "image") {
    return {
      kind: "image",
      opacity: input.opacity ?? 0.7,
      anchor: input.position ?? input.anchor ?? "bottom-right",
      offsetX: padding,
      offsetY: padding,
      scale: input.scale ?? 0.25,
    };
  }
  return {
    kind: "text",
    text: input.text,
    font: "sans",
    color: input.color ?? "#ffffff",
    opacity: input.opacity ?? 0.7,
    anchor: input.position ?? input.anchor ?? "bottom-right",
    offsetX: padding,
    offsetY: padding,
  };
}

function translateQuickEnhance(value: unknown): unknown {
  const input = asRecord(value);
  return {
    normalize: input.normalize ?? true,
    brightness: input.brightness ?? 1,
    saturation: input.saturation ?? 1,
    hue: input.hue ?? 0,
    sharpen: input.sharpen ?? false,
  };
}

function translatePipeline(value: unknown): unknown {
  const input = asRecord(value);
  const steps: unknown[] = [];
  const output: Record<string, unknown> = {};

  for (const oldStep of arrayOfRecords(input.ops)) {
    const operation = oldStep.op;
    const options = oldStep.options;
    switch (operation) {
      case "resize":
        steps.push({ op: "resize", options: translateResize(options) });
        break;
      case "crop":
        steps.push({ op: "crop", options: translateCrop(options) });
        break;
      case "rotate":
        steps.push({ op: "rotate", options: translateRotate(options) });
        break;
      case "autoEnhance":
      case "auto-enhance":
        steps.push({
          op: "quick-enhance",
          options: translateQuickEnhance(options),
        });
        break;
      case "convert": {
        const converted = asRecord(translateConvert(options));
        Object.assign(output, converted);
        break;
      }
      case "compress":
        {
          const compressed = asRecord(translateCompress(options));
          if (compressed.format === "auto") delete compressed.format;
          Object.assign(output, compressed);
        }
        break;
      case "clean":
        output.metadata = "strip";
        break;
      default:
        // Parsing below intentionally rejects a request whose only content was
        // an unknown operation while preserving known v1 operations.
        steps.push({ op: operation, options });
    }
  }

  return { version: 1, steps, output };
}

const mapping = {
  metadata: {
    toolId: "metadata",
    v2Route: "metadata",
    translateOptions: (value: unknown) => asRecord(value),
  },
  clean: {
    toolId: "metadata-clean",
    v2Route: "metadata/clean",
    translateOptions: translateClean,
  },
  compress: {
    toolId: "compress",
    v2Route: "compress",
    translateOptions: translateCompress,
  },
  resize: {
    toolId: "resize",
    v2Route: "resize",
    translateOptions: translateResize,
  },
  convert: {
    toolId: "convert",
    v2Route: "convert",
    translateOptions: translateConvert,
  },
  crop: {
    toolId: "crop",
    v2Route: "crop",
    translateOptions: translateCrop,
  },
  rotate: {
    toolId: "rotate",
    v2Route: "rotate",
    translateOptions: translateRotate,
  },
  watermark: {
    toolId: "watermark",
    v2Route: "watermark",
    translateOptions: translateWatermark,
  },
  "auto-enhance": {
    toolId: "quick-enhance",
    v2Route: "quick-enhance",
    translateOptions: translateQuickEnhance,
  },
  transform: {
    toolId: "process",
    v2Route: "process",
    translateOptions: translatePipeline,
  },
  batch: {
    toolId: "batch",
    v2Route: "batch",
    translateOptions: (value: unknown) => ({
      pipeline: translatePipeline(value),
      continueOnError: true,
      filenamePrefix: "processed",
    }),
  },
} satisfies Record<V1OperationId, Omit<V1OperationMapping, "v2Path">>;

export const V1_OPERATION_MAP: Readonly<
  Record<V1OperationId, V1OperationMapping>
> = Object.freeze(
  Object.fromEntries(
    Object.entries(mapping).map(([operation, entry]) => [
      operation,
      { ...entry, v2Path: `/api/v2/images/${entry.v2Route}` },
    ]),
  ) as Record<V1OperationId, V1OperationMapping>,
);

export function isV1OperationId(value: string): value is V1OperationId {
  return (V1_OPERATION_IDS as readonly string[]).includes(value);
}

export function mapV1Operation(operation: V1OperationId): V1OperationMapping {
  return V1_OPERATION_MAP[operation];
}

export function translateV1Options(
  operation: V1OperationId,
  options: unknown,
): unknown {
  const entry = V1_OPERATION_MAP[operation];
  const translated = entry.translateOptions(options);
  return getToolOptionsSchema(entry.toolId).parse(translated);
}
