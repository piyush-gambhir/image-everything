import {
  ChromaKeyOptionsSchema,
  ColorMatrixOptionsSchema,
  ColorSpaceOptionsSchema,
  ConvolveOptionsSchema,
  DuotoneOptionsSchema,
  ExtractChannelOptionsSchema,
  LIMITS,
  LevelsOptionsSchema,
  MAX_RAW_BYTES,
  MorphologyOptionsSchema,
  NoiseOptionsSchema,
  PosterizeOptionsSchema,
  ReplaceColorOptionsSchema,
  SolarizeOptionsSchema,
  type OutputFormat,
} from "@image-everything/contracts";
import sharp, { type Sharp } from "sharp";

import { DomainError } from "./errors";
import { enforceOutputDimensions, openStillImage } from "./input";
import { encodeImage, type ImageExecutionResult } from "./output";

type RgbaImage = {
  data: Buffer;
  width: number;
  height: number;
};
type Rgb = [number, number, number];

function byte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgb(hex: string): Rgb {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function deadlineCheck(started: number): void {
  if (Date.now() - started > LIMITS.deadlineMs) {
    throw new DomainError(
      "EXECUTION_TIMEOUT",
      "Image processing exceeded its execution deadline.",
      504,
      { retryable: true },
    );
  }
}

async function rgbaImage(buffer: Buffer): Promise<RgbaImage> {
  const opened = await openStillImage(buffer);
  enforceOutputDimensions(opened.width, opened.height);
  if (opened.width * opened.height * 4 > MAX_RAW_BYTES) {
    throw new DomainError(
      "OUTPUT_LIMIT_EXCEEDED",
      `Pixel effects require at most ${MAX_RAW_BYTES} bytes of decoded RGBA pixels.`,
      413,
    );
  }
  const { data, info } = await opened.image
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function rawPipeline(image: RgbaImage): Sharp {
  return sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: 4 },
    limitInputPixels: LIMITS.maxInputPixels,
  }).timeout({ seconds: Math.ceil(LIMITS.deadlineMs / 1000) });
}

function mapPixels(
  image: RgbaImage,
  transform: (red: number, green: number, blue: number, offset: number) => void,
): void {
  const started = Date.now();
  for (let offset = 0; offset < image.data.length; offset += 4) {
    if (offset % 1_048_576 === 0) deadlineCheck(started);
    transform(
      image.data[offset],
      image.data[offset + 1],
      image.data[offset + 2],
      offset,
    );
  }
}

function setRgb(image: RgbaImage, offset: number, values: Rgb): void {
  image.data[offset] = byte(values[0]);
  image.data[offset + 1] = byte(values[1]);
  image.data[offset + 2] = byte(values[2]);
}

// A square max/min filter is separable. Monotonic queues make processing linear
// in the number of pixels instead of multiplying it by the kernel area.
function morphologyPass(
  image: RgbaImage,
  radius: number,
  maximum: boolean,
  horizontal: boolean,
): void {
  const { width, height, data } = image;
  const length = horizontal ? width : height;
  const lines = horizontal ? height : width;
  const output = Buffer.from(data);
  const queue = new Int32Array(length);
  const started = Date.now();
  for (let line = 0; line < lines; line += 1) {
    if (line % 64 === 0) deadlineCheck(started);
    const offset = (index: number, channel: number) =>
      (horizontal ? line * width + index : index * width + line) * 4 + channel;
    for (let channel = 0; channel < 3; channel += 1) {
      let head = 0;
      let tail = 0;
      let next = 0;
      for (let index = 0; index < length; index += 1) {
        const right = Math.min(length - 1, index + radius);
        while (next <= right) {
          const value = data[offset(next, channel)];
          while (
            tail > head &&
            (maximum
              ? data[offset(queue[tail - 1], channel)] <= value
              : data[offset(queue[tail - 1], channel)] >= value)
          ) {
            tail -= 1;
          }
          queue[tail++] = next++;
        }
        while (queue[head] < index - radius) head += 1;
        output[offset(index, channel)] = data[offset(queue[head], channel)];
      }
    }
  }
  image.data = output;
}

function morphology(image: RgbaImage, radius: number, maximum: boolean): void {
  morphologyPass(image, radius, maximum, true);
  morphologyPass(image, radius, maximum, false);
}

function finish(
  image: RgbaImage,
  filename: string,
  options: { format: OutputFormat; quality: number; lossless: boolean },
): Promise<ImageExecutionResult> {
  return encodeImage(rawPipeline(image), options.format, filename, options);
}

export async function executeEffect(
  toolId: string,
  buffer: Buffer,
  filename: string,
  inputOptions: unknown,
): Promise<ImageExecutionResult> {
  switch (toolId) {
    case "color-space": {
      const options = ColorSpaceOptionsSchema.parse(inputOptions);
      const opened = await openStillImage(buffer);
      enforceOutputDimensions(opened.width, opened.height);
      return encodeImage(
        opened.image.toColourspace(options.space),
        options.format,
        filename,
        options,
      );
    }
    case "extract-channel": {
      const options = ExtractChannelOptionsSchema.parse(inputOptions);
      // Resolve input ICC/CMYK conversion before selecting a band. A pipeline
      // colourspace override can otherwise produce different RGB values from
      // inspection and the other effects for the very same source pixel.
      const image = await rgbaImage(buffer);
      return encodeImage(
        rawPipeline(image).extractChannel(options.channel),
        options.format,
        filename,
        options,
      );
    }
    case "duotone": {
      const options = DuotoneOptionsSchema.parse(inputOptions);
      const image = await rgbaImage(buffer);
      const dark = rgb(options.dark);
      const light = rgb(options.light);
      mapPixels(image, (red, green, blue, offset) => {
        const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
        setRgb(image, offset, [
          red * (1 - options.amount) +
            (dark[0] + (light[0] - dark[0]) * luminance) * options.amount,
          green * (1 - options.amount) +
            (dark[1] + (light[1] - dark[1]) * luminance) * options.amount,
          blue * (1 - options.amount) +
            (dark[2] + (light[2] - dark[2]) * luminance) * options.amount,
        ]);
      });
      return finish(image, filename, options);
    }
    case "posterize": {
      const options = PosterizeOptionsSchema.parse(inputOptions);
      const image = await rgbaImage(buffer);
      const factor = options.levels - 1;
      const quantize = (value: number) =>
        (Math.round((value / 255) * factor) * 255) / factor;
      mapPixels(image, (red, green, blue, offset) => {
        setRgb(image, offset, [quantize(red), quantize(green), quantize(blue)]);
      });
      return finish(image, filename, options);
    }
    case "solarize": {
      const options = SolarizeOptionsSchema.parse(inputOptions);
      const image = await rgbaImage(buffer);
      const transform = (value: number) =>
        value >= options.threshold ? 255 - value : value;
      mapPixels(image, (red, green, blue, offset) => {
        setRgb(image, offset, [
          transform(red),
          transform(green),
          transform(blue),
        ]);
      });
      return finish(image, filename, options);
    }
    case "levels": {
      const options = LevelsOptionsSchema.parse(inputOptions);
      const image = await rgbaImage(buffer);
      const transform = (value: number) =>
        255 *
        Math.pow(
          Math.max(
            0,
            Math.min(
              1,
              (value - options.black) / (options.white - options.black),
            ),
          ),
          1 / options.gamma,
        );
      mapPixels(image, (red, green, blue, offset) => {
        setRgb(image, offset, [
          transform(red),
          transform(green),
          transform(blue),
        ]);
      });
      return finish(image, filename, options);
    }
    case "color-matrix": {
      const options = ColorMatrixOptionsSchema.parse(inputOptions);
      const image = await rgbaImage(buffer);
      const m = options.matrix;
      mapPixels(image, (red, green, blue, offset) => {
        setRgb(image, offset, [
          m[0] * red + m[1] * green + m[2] * blue,
          m[3] * red + m[4] * green + m[5] * blue,
          m[6] * red + m[7] * green + m[8] * blue,
        ]);
      });
      return finish(image, filename, options);
    }
    case "convolve": {
      const options = ConvolveOptionsSchema.parse(inputOptions);
      const image = await rgbaImage(buffer);
      const presets = {
        edge: {
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
          scale: 1,
          offset: 0,
        },
        emboss: {
          kernel: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
          scale: 1,
          offset: 128,
        },
        sharpen: {
          kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0],
          scale: 1,
          offset: 0,
        },
        "box-blur": {
          kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
          scale: 9,
          offset: 0,
        },
        custom: {
          kernel: options.kernel,
          scale: options.scale,
          offset: options.offset,
        },
      };
      // Convolution should filter colour, not alter transparency. Construct a
      // three-channel source so libvips cannot premultiply or filter alpha.
      const source = Buffer.allocUnsafe(image.width * image.height * 3);
      mapPixels(image, (red, green, blue, offset) => {
        const destination = (offset / 4) * 3;
        source[destination] = red;
        source[destination + 1] = green;
        source[destination + 2] = blue;
      });
      const convolved = await sharp(source, {
        raw: { width: image.width, height: image.height, channels: 3 },
        limitInputPixels: LIMITS.maxInputPixels,
      })
        .timeout({ seconds: Math.ceil(LIMITS.deadlineMs / 1000) })
        .convolve({ width: 3, height: 3, ...presets[options.preset] })
        .raw()
        .toBuffer();
      mapPixels(image, (_red, _green, _blue, offset) => {
        const sourceOffset = (offset / 4) * 3;
        image.data[offset] = convolved[sourceOffset];
        image.data[offset + 1] = convolved[sourceOffset + 1];
        image.data[offset + 2] = convolved[sourceOffset + 2];
      });
      return finish(image, filename, options);
    }
    case "morphology": {
      const options = MorphologyOptionsSchema.parse(inputOptions);
      const image = await rgbaImage(buffer);
      morphology(image, options.radius, options.mode === "dilate");
      return finish(image, filename, options);
    }
    case "replace-color": {
      const options = ReplaceColorOptionsSchema.parse(inputOptions);
      const image = await rgbaImage(buffer);
      const from = rgb(options.from);
      const to = rgb(options.to);
      const squaredTolerance = options.tolerance ** 2;
      mapPixels(image, (red, green, blue, offset) => {
        if (
          (red - from[0]) ** 2 +
            (green - from[1]) ** 2 +
            (blue - from[2]) ** 2 <=
          squaredTolerance
        ) {
          setRgb(image, offset, to);
        }
      });
      return finish(image, filename, options);
    }
    case "chroma-key": {
      const options = ChromaKeyOptionsSchema.parse(inputOptions);
      const image = await rgbaImage(buffer);
      const key = rgb(options.color);
      mapPixels(image, (red, green, blue, offset) => {
        const distance = Math.hypot(
          red - key[0],
          green - key[1],
          blue - key[2],
        );
        const coverage =
          distance <= options.tolerance
            ? 0
            : options.softness === 0
              ? 1
              : Math.min(1, (distance - options.tolerance) / options.softness);
        image.data[offset + 3] = byte(image.data[offset + 3] * coverage);
      });
      return finish(image, filename, options);
    }
    case "noise": {
      const options = NoiseOptionsSchema.parse(inputOptions);
      const image = await rgbaImage(buffer);
      let state = options.seed;
      const random = () => {
        state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
        return ((state / 4294967296) * 2 - 1) * options.amount;
      };
      mapPixels(image, (red, green, blue, offset) => {
        const first = random();
        setRgb(image, offset, [
          red + first,
          green + (options.monochrome ? first : random()),
          blue + (options.monochrome ? first : random()),
        ]);
      });
      return finish(image, filename, options);
    }
    default:
      throw new DomainError(
        "INVALID_OPTIONS",
        `Unknown image effect: ${toolId}.`,
        422,
      );
  }
}
