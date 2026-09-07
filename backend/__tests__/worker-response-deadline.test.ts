import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import type { INestApplication } from "@nestjs/common";
import { LIMITS, WORKER_PROTOCOL_VERSION } from "@image-everything/contracts";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ImageWorkerClient } from "@/worker/image-worker.client";
import { createApp } from "@/app";

const timeoutProblem = {
  problem: { status: 504, code: "EXECUTION_TIMEOUT", retryable: true },
};

describe("private worker response lifetime", () => {
  const client = new ImageWorkerClient();
  const closed = new Set<string>();
  const signals: AbortSignal[] = [];
  const responses = new Set<ServerResponse>();
  let readinessStalls = false;
  let trickleWrites = 0;
  let app: INestApplication;
  let apiOrigin: string;
  const server = createServer((request, response) => {
    request.resume();
    const scenario = request.headers["x-request-id"];
    const routes: Record<string, string> = {
      "deadline-json": "/v2/json-stall",
      "deadline-binary": "/v2/stall",
      "deadline-partial": "/v2/trickle",
      "deadline-invalid": "/v2/invalid-success",
    };
    const route =
      (typeof scenario === "string" && routes[scenario]) || request.url || "/";
    responses.add(response);
    response.once("close", () => {
      responses.delete(response);
      closed.add(route);
    });
    if (route === "/v2/delayed-headers") {
      const timer = setTimeout(() => response.end("late"), 1_000);
      response.once("close", () => clearTimeout(timer));
      return;
    }
    if (route === "/v2/problem-stall") {
      response.writeHead(422, { "content-type": "application/problem+json" });
      response.flushHeaders();
      return;
    }
    if (route === "/v2/invalid-problem") {
      response.writeHead(500, { "content-type": "text/html" });
      response.flushHeaders();
      return;
    }
    if (route === "/v2/json-stall" || route === "/v2/invalid-success") {
      response.writeHead(200, {
        "content-type":
          route === "/v2/json-stall" ? "application/json" : "text/html",
      });
      response.flushHeaders();
      return;
    }
    if (route === "/ready" || route === "/v2/capabilities") {
      response.writeHead(200, { "content-type": "application/json" });
      if (route === "/ready" && readinessStalls) {
        response.flushHeaders();
        return;
      }
      response.end(
        JSON.stringify(
          route === "/ready"
            ? { status: "ready" }
            : {
                apiVersion: "v2",
                protocolVersion: WORKER_PROTOCOL_VERSION,
                workerVersion: "test",
                runtime: {
                  node: process.version,
                  sharp: "test",
                  libvips: "test",
                  versions: {},
                },
                codecs: [],
                formats: { decode: [], encode: [] },
                operations: [],
                animationSupported: false,
                limits: LIMITS,
                capabilityFingerprint: "test",
              },
        ),
      );
      return;
    }
    response.writeHead(200, { "content-type": "image/png" });
    response.flushHeaders();
    if (route === "/v2/trickle") {
      const interval = setInterval(() => {
        trickleWrites += 1;
        response.write("x");
      }, 15);
      response.once("close", () => clearInterval(interval));
    } else if (route === "/v2/complete") {
      response.write("first");
      const timer = setTimeout(() => response.end("second"), 20);
      response.once("close", () => clearTimeout(timer));
    } else if (route === "/v2/disconnect") {
      const timer = setTimeout(() => response.destroy(), 20);
      response.once("close", () => clearTimeout(timer));
    }
  });

  beforeAll(async () => {
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    app = await createApp({ logger: false });
    await app.listen(0, "127.0.0.1");
    apiOrigin = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  beforeEach(() => {
    readinessStalls = false;
    trickleWrites = 0;
    closed.clear();
    signals.length = 0;
    vi.stubEnv(
      "IMAGE_WORKER_URL",
      `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    );
    vi.stubEnv("IMAGE_WORKER_TOKEN", "deadline-test-token");
    vi.stubEnv("IMAGE_WORKER_DEADLINE_MS", "150");
    vi.stubEnv("API_KEY", "deadline-public-key");
    const fetch = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (init?.signal) signals.push(init.signal);
      return fetch(input, init);
    });
  });
  afterEach(() => {
    for (const response of responses) response.destroy();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  afterAll(async () => {
    await app?.close();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  const execute = (route: string) => client.execute({ route, uploads: [] });
  const publicRequest = (operation: string, scenario: string) => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array([1])]), "fixture.png");
    form.append(
      "options",
      JSON.stringify(operation === "convert" ? { format: "png" } : {}),
    );
    return fetch(`${apiOrigin}/api/v2/images/${operation}`, {
      method: "POST",
      headers: {
        Authorization: "Bearer deadline-public-key",
        "X-Request-Id": scenario,
      },
      body: form,
    });
  };

  it("keeps the header deadline and aborts the upstream connection", async () => {
    await expect(execute("delayed-headers")).rejects.toMatchObject(
      timeoutProblem,
    );
    await vi.waitFor(() =>
      expect(closed.has("/v2/delayed-headers")).toBe(true),
    );
  });

  it("times out a response that sends headers but never sends its body", async () => {
    const response = await execute("stall");
    expect(response.status).toBe(200);
    await expect(response.arrayBuffer()).rejects.toMatchObject(timeoutProblem);
    await vi.waitFor(() => expect(closed.has("/v2/stall")).toBe(true));
  });

  it("applies one absolute deadline even when body bytes keep arriving", async () => {
    const response = await execute("trickle");
    await expect(response.text()).rejects.toMatchObject(timeoutProblem);
    expect(trickleWrites).toBeGreaterThan(1);
    await vi.waitFor(() => expect(closed.has("/v2/trickle")).toBe(true));
  });

  it("clears the timer after the streamed response has been fully consumed", async () => {
    const response = await execute("complete");
    expect(await response.text()).toBe("firstsecond");
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(signals[0]?.aborted).toBe(false);
  });

  it("cancels the upstream body and clears the timer when the consumer cancels", async () => {
    const response = await execute("stall");
    await response.body!.cancel();
    await vi.waitFor(() => expect(closed.has("/v2/stall")).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(signals[0]?.aborted).toBe(false);
  });

  it("maps a broken body to a safe worker error and releases its timer", async () => {
    const response = await execute("disconnect");
    await expect(response.arrayBuffer()).rejects.toMatchObject({
      problem: { status: 502, code: "WORKER_BAD_RESPONSE" },
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(signals[0]?.aborted).toBe(false);
  });

  it("retains a timeout while reading a private worker problem body", async () => {
    await expect(execute("problem-stall")).rejects.toMatchObject(
      timeoutProblem,
    );
  });

  it("cancels an invalid worker error body immediately", async () => {
    await expect(execute("invalid-problem")).rejects.toMatchObject({
      problem: { status: 502, code: "WORKER_BAD_RESPONSE" },
    });
    await vi.waitFor(() =>
      expect(closed.has("/v2/invalid-problem")).toBe(true),
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(signals[0]?.aborted).toBe(false);
  });

  it.each([
    ["validate", "deadline-json"],
    ["convert", "deadline-binary"],
  ])(
    "returns a stable public 504 when %s stalls before output bytes",
    async (operation, scenario) => {
      const response = await publicRequest(operation, scenario);
      expect(response.status).toBe(504);
      expect(await response.json()).toMatchObject(timeoutProblem.problem);
    },
  );

  it("terminates an incomplete public image stream after its deadline", async () => {
    const response = await publicRequest("convert", "deadline-partial");
    expect(response.status).toBe(200);
    await expect(response.arrayBuffer()).rejects.toThrow();
    await vi.waitFor(() => expect(closed.has("/v2/trickle")).toBe(true));
  });

  it("cancels the private stream when a public client disconnects", async () => {
    const response = await publicRequest("convert", "deadline-partial");
    await response.body!.cancel();
    await vi.waitFor(() => expect(closed.has("/v2/trickle")).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(signals[0]?.aborted).toBe(false);
  });

  it("releases an unread successful worker body rejected by the gateway", async () => {
    const response = await publicRequest("convert", "deadline-invalid");
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      code: "WORKER_BAD_RESPONSE",
    });
    await vi.waitFor(() =>
      expect(closed.has("/v2/invalid-success")).toBe(true),
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(signals[0]?.aborted).toBe(false);
  });

  it("cleans up discovery responses and preserves stalled discovery body timeouts", async () => {
    await expect(client.ready()).resolves.toMatchObject({ status: "ready" });
    await expect(client.capabilities()).resolves.toMatchObject({
      apiVersion: "v2",
    });
    readinessStalls = true;
    await expect(client.ready()).rejects.toMatchObject(timeoutProblem);
    expect(signals[0]?.aborted).toBe(false);
    expect(signals[1]?.aborted).toBe(false);
    expect(signals[2]?.aborted).toBe(true);
  }, 10_000);
});
