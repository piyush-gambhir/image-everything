import { createImageWorkerServer } from "./http/server";

const token = process.env.IMAGE_WORKER_TOKEN;
if (!token) {
  throw new Error("IMAGE_WORKER_TOKEN is required");
}

const parsedPort = Number(
  process.env.IMAGE_WORKER_PORT ?? process.env.PORT ?? "3020",
);
if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
  throw new Error(
    "IMAGE_WORKER_PORT (or PORT) must be an integer between 1 and 65535",
  );
}
const host = process.env.HOST ?? "0.0.0.0";
const configuredMaxBytes = process.env.IMAGE_WORKER_MAX_REQUEST_BYTES;
const maxRequestBytes =
  configuredMaxBytes === undefined ? undefined : Number(configuredMaxBytes);
const configuredConcurrency = process.env.IMAGE_WORKER_MAX_CONCURRENT_REQUESTS;
const maxConcurrentRequests =
  configuredConcurrency === undefined
    ? undefined
    : Number(configuredConcurrency);
const server = createImageWorkerServer({
  token,
  maxRequestBytes,
  maxConcurrentRequests,
});
server.listen(parsedPort, host, () => {
  process.stdout.write(`image-worker listening on ${host}:${parsedPort}\n`);
});

const shutdown = () => {
  server.close((error) => {
    process.exitCode = error ? 1 : 0;
  });
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
