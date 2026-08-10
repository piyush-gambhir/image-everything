import sharp from "sharp";

export type WorkerFixtures = Awaited<ReturnType<typeof createFixtures>>;

let fixturePromise: Promise<WorkerFixtures> | undefined;

function deterministicPixels(width: number, height: number): Buffer {
  const pixels = Buffer.allocUnsafe(width * height * 4);
  let state = 0x1234abcd;
  for (let index = 0; index < width * height; index += 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    pixels[index * 4] = (state >>> 24) & 0xff;
    pixels[index * 4 + 1] = (state >>> 16) & 0xff;
    pixels[index * 4 + 2] = (state >>> 8) & 0xff;
    pixels[index * 4 + 3] = index % 7 === 0 ? 180 : 255;
  }
  return pixels;
}

async function createFixtures() {
  const width = 120;
  const height = 80;
  const pixels = deterministicPixels(width, height);
  const basePng = await sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
  const baseJpeg = await sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 94 })
    .withExif({
      IFD0: { Artist: "Fixture Artist", Copyright: "Fixture Copyright" },
    })
    .toBuffer();
  const changedPng = await sharp(basePng)
    .modulate({ brightness: 0.7, saturation: 1.2 })
    .png()
    .toBuffer();
  const overlayPng = await sharp({
    create: { width: 30, height: 15, channels: 4, background: "#00ff00cc" },
  })
    .png()
    .toBuffer();
  const trimPng = await sharp({
    create: { width: 60, height: 40, channels: 3, background: "#ff0000" },
  })
    .extend({ top: 10, right: 10, bottom: 10, left: 10, background: "#ffffff" })
    .png()
    .toBuffer();
  return { width, height, basePng, baseJpeg, changedPng, overlayPng, trimPng };
}

export function getFixtures(): Promise<WorkerFixtures> {
  fixturePromise ??= createFixtures();
  return fixturePromise;
}

export const ANIMATED_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAAAQABAAACAkQBACH5BAAKAAAALAAAAAABAAEAAAICTAEAOw==",
  "base64",
);

export const MULTIPAGE_TIFF = Buffer.from(
  "SUkqABYAAAB4nPvPwPAfhgAd7gP9AAoAAAEDAAEAAAACAAAAAQEDAAEAAAACAAAAAgEDAAMAAACUAAAAAwEDAAEAAAAIAAAABgEDAAEAAAACAAAAEQEEAAEAAAAIAAAAFQEDAAEAAAADAAAAFgEDAAEAAAACAAAAFwEEAAEAAAANAAAAHAEDAAEAAAABAAAAtgAAAAgACAAIAAAAAAAAAElJKgAWAAAAeJxjYPjPAEMAFfYD/QAKAAABAwABAAAAAgAAAAEBAwABAAAAAgAAAAIBAwADAAAANAEAAAMBAwABAAAACAAAAAYBAwABAAAAAgAAABEBBAABAAAAqAAAABUBAwABAAAAAwAAABYBAwABAAAAAgAAABcBBAABAAAADQAAABwBAwABAAAAAQAAAAAAAAAIAAgACAAAAAAAAAA=",
  "base64",
);
