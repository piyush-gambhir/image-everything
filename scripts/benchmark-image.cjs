const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { performance } = require("node:perf_hooks");
const { createHash } = require("node:crypto");
const path = require("node:path");
const workerRequire = createRequire(
  path.resolve(__dirname, "../workers/image-worker/package.json"),
);
const sharp = workerRequire("sharp");
const { executeRoute } = workerRequire("./dist/index.js");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function main() {
  sharp.cache(false);
  sharp.concurrency(1);
  const raw = Buffer.alloc(1920 * 1080 * 3);
  for (let i = 0; i < raw.length; i++)
    raw[i] = (i * 17 + Math.floor(i / 1920)) % 256;
  const input = await sharp(raw, {
    raw: { width: 1920, height: 1080, channels: 3 },
  })
    .png()
    .toBuffer();
  const parts = [
    {
      fieldName: "file",
      filename: "fixture.png",
      contentType: "image/png",
      buffer: input,
    },
  ];
  const options = {
    steps: [{ op: "resize", options: { width: 512, height: 512 } }],
    output: { format: "webp", quality: 80 },
  };
  let result;
  for (let i = 0; i < 3; i++)
    result = await executeRoute("process", parts, options);
  const metadata = await sharp(result.body).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);
  const expectedHash = hash(result.body);
  const samples = [];
  for (let i = 0; i < 25; i++) {
    const before = performance.now();
    result = await executeRoute("process", parts, options);
    samples.push(performance.now() - before);
    assert.equal(hash(result.body), expectedHash);
  }
  console.log(
    JSON.stringify({
      node: process.version,
      sharp: sharp.versions.sharp,
      vips: sharp.versions.vips,
      warmups: 3,
      samples,
      inputSha256: hash(input),
      outputBytes: result.body.length,
      outputSha256: expectedHash,
    }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
