import { createHash } from "node:crypto";

import {
  INPUT_FORMATS,
  LIMITS,
  OUTPUT_FORMATS,
  TOOL_IDS,
  WORKER_PROTOCOL_VERSION,
  type InputFormat,
  type OutputFormat,
  type WorkerCapabilities,
} from "@image-everything/contracts";
import sharp from "sharp";

import { decodeHeic } from "./heic";
import { HEIC_PROBE_FIXTURE } from "./heic-probe-fixture";

const WORKER_VERSION = "0.2.0";

let capabilitiesPromise: Promise<WorkerCapabilities> | undefined;

function runtimeSupport(format: InputFormat): {
  input: boolean;
  output: boolean;
} {
  const key =
    format === "avif" || format === "heic" || format === "heif"
      ? "heif"
      : format;
  const entry = sharp.format[key as keyof typeof sharp.format] as
    | { input?: unknown; output?: unknown }
    | undefined;
  return {
    input: Boolean(entry?.input),
    output: Boolean(entry?.output),
  };
}

async function encodeProbe(format: OutputFormat): Promise<boolean> {
  try {
    let image = sharp({
      create: {
        width: 2,
        height: 2,
        channels: 4,
        background: { r: 20, g: 80, b: 160, alpha: 1 },
      },
    });
    switch (format) {
      case "jpeg":
        image = image.jpeg({ quality: 70 });
        break;
      case "png":
        image = image.png();
        break;
      case "webp":
        image = image.webp({ quality: 70 });
        break;
      case "avif":
        image = image.avif({ quality: 50, effort: 0 });
        break;
      case "gif":
        image = image.gif();
        break;
      case "tiff":
        image = image.tiff();
        break;
    }
    const encoded = await image.toBuffer();
    const metadata = await sharp(encoded, { failOn: "warning" }).metadata();
    return Boolean(metadata.width && metadata.height);
  } catch {
    return false;
  }
}

export async function probeCapabilities(): Promise<WorkerCapabilities> {
  const encodeResults = new Map<OutputFormat, boolean>();
  await Promise.all(
    OUTPUT_FORMATS.map(async (format) => {
      const reported = runtimeSupport(format).output;
      encodeResults.set(format, reported && (await encodeProbe(format)));
    }),
  );

  let heicDecode = false;
  try {
    const decoded = await decodeHeic(HEIC_PROBE_FIXTURE);
    const encoded = await sharp(decoded.data, {
      raw: {
        width: decoded.width,
        height: decoded.height,
        channels: decoded.channels,
      },
    })
      .png()
      .toBuffer();
    const roundTrip = await sharp(encoded).metadata();
    heicDecode =
      decoded.width === 64 &&
      decoded.height === 48 &&
      decoded.data.length === decoded.width * decoded.height * 4 &&
      roundTrip.width === decoded.width &&
      roundTrip.height === decoded.height;
  } catch {
    heicDecode = false;
  }

  const codecs = INPUT_FORMATS.map((format) => {
    const reported = runtimeSupport(format);
    const outputFormat = OUTPUT_FORMATS.find(
      (candidate) => candidate === format,
    );
    const decode =
      format === "heic"
        ? heicDecode
        : format === "heif"
          ? false
          : outputFormat
            ? (encodeResults.get(outputFormat) ?? false)
            : false;
    const encode = outputFormat
      ? (encodeResults.get(outputFormat) ?? false)
      : false;
    return {
      format,
      decode,
      encode,
      runtimeReportedDecode: reported.input,
      runtimeReportedEncode: reported.output,
      reason:
        format === "heic" && heicDecode
          ? "Verified with an embedded HEIC decode and PNG round-trip probe"
          : format === "heif"
            ? "Generic HEIF is not advertised without an independent fixture probe"
            : undefined,
    };
  });

  const decode = codecs
    .filter((codec) => codec.decode)
    .map((codec) => codec.format);
  const encode = codecs
    .filter(
      (codec) =>
        codec.encode && OUTPUT_FORMATS.includes(codec.format as OutputFormat),
    )
    .map((codec) => codec.format as OutputFormat);

  const runtimeVersions = Object.fromEntries(
    Object.entries(sharp.versions).map(([key, value]) => [key, String(value)]),
  );
  const available =
    decode.includes("jpeg") &&
    encode.includes("jpeg") &&
    encode.includes("png");
  const operations = TOOL_IDS.map((id) => ({
    id,
    available,
    reason: available
      ? undefined
      : "The required JPEG/PNG baseline runtime is unavailable",
  }));
  const fingerprintPayload = JSON.stringify({
    protocol: WORKER_PROTOCOL_VERSION,
    runtimeVersions,
    codecs,
    operations,
    limits: LIMITS,
  });

  return {
    apiVersion: "v2",
    protocolVersion: WORKER_PROTOCOL_VERSION,
    workerVersion: WORKER_VERSION,
    runtime: {
      node: process.version,
      sharp: sharp.versions.sharp,
      libvips: sharp.versions.vips,
      versions: runtimeVersions,
    },
    codecs,
    formats: { decode, encode },
    operations,
    animationSupported: false,
    limits: { ...LIMITS },
    capabilityFingerprint: createHash("sha256")
      .update(fingerprintPayload)
      .digest("hex"),
  };
}

export function getCapabilities(): Promise<WorkerCapabilities> {
  capabilitiesPromise ??= probeCapabilities();
  return capabilitiesPromise;
}

export function resetCapabilitiesForTests(): void {
  capabilitiesPromise = undefined;
}
