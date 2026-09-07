import { once } from "node:events";
import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { ExecutionResult } from "../src/core/output";
import { executeRoute } from "../src/core/execute";
import { createImageWorkerServer } from "../src/http/server";

vi.mock("../src/core/execute", () => ({ executeRoute: vi.fn() }));
vi.mock("@image-everything/contracts", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@image-everything/contracts")>();
  return { ...actual, LIMITS: { ...actual.LIMITS, deadlineMs: 500 } };
});

const servers: ReturnType<typeof createImageWorkerServer>[] = [];
const token = "admission-test-token";
const headers = { authorization: `Bearer ${token}` };

afterEach(async () => {
  vi.mocked(executeRoute).mockReset();
  for (const server of servers.splice(0)) {
    server.close();
    server.closeAllConnections();
    await once(server, "close");
  }
});

async function start(): Promise<string> {
  const server = createImageWorkerServer({ token, maxConcurrentRequests: 1 });
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function payload(): FormData {
  const form = new FormData();
  form.append("file", new Blob(["fixture"]), "fixture.png");
  return form;
}

function pendingExecution() {
  let resolve!: (value: ExecutionResult) => void;
  let reject!: (error: Error) => void;
  let started!: () => void;
  const entered = new Promise<void>((done) => {
    started = done;
  });
  const result = new Promise<ExecutionResult>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  vi.mocked(executeRoute).mockImplementationOnce(() => {
    started();
    return result;
  });
  return { resolve, reject, entered };
}

describe("worker admission", () => {
  it.each([0, 33, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid concurrency %s",
    (maxConcurrentRequests) => {
      expect(() =>
        createImageWorkerServer({ token, maxConcurrentRequests }),
      ).toThrow("maxConcurrentRequests must be an integer between 1 and 32");
    },
  );

  it("rejects overflow before parsing its upload and releases failed requests", async () => {
    const origin = await start();
    const pending = pendingExecution();
    const first = fetch(`${origin}/v2/metadata`, {
      method: "POST",
      headers,
      body: payload(),
    });
    await pending.entered;

    // This request has no multipart content type. Capacity must win before
    // the worker attempts to consume or validate the upload body.
    const overflow = await fetch(`${origin}/v2/metadata`, {
      method: "POST",
      headers,
    });
    expect(overflow.status).toBe(503);
    expect(overflow.headers.get("retry-after")).toBe("1");
    expect(await overflow.json()).toMatchObject({
      code: "WORKER_UNAVAILABLE",
      retryable: true,
    });
    expect((await fetch(`${origin}/health`)).status).toBe(200);
    expect(executeRoute).toHaveBeenCalledTimes(1);

    pending.reject(new Error("test execution failed"));
    expect((await first).status).toBe(500);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const malformed = await fetch(`${origin}/v2/metadata`, {
        method: "POST",
        headers,
      });
      expect(malformed.status).toBe(400);
      expect(await malformed.json()).toMatchObject({
        code: "MALFORMED_MULTIPART",
      });
    }
  });

  it("retains capacity after a deadline until native execution actually settles", async () => {
    const origin = await start();
    const pending = pendingExecution();
    const first = fetch(`${origin}/v2/metadata`, {
      method: "POST",
      headers,
      body: payload(),
    });
    await pending.entered;
    const timedOut = await first;
    expect(timedOut.status).toBe(504);
    expect(await timedOut.json()).toMatchObject({ code: "EXECUTION_TIMEOUT" });

    const overflow = await fetch(`${origin}/v2/metadata`, {
      method: "POST",
      headers,
    });
    expect(overflow.status).toBe(503);
    pending.resolve({ kind: "json", body: { finished: true } });
    await Promise.resolve();

    const recovered = await fetch(`${origin}/v2/metadata`, {
      method: "POST",
      headers,
    });
    expect(recovered.status).toBe(400);
    expect(await recovered.json()).toMatchObject({
      code: "MALFORMED_MULTIPART",
    });
  });

  it("expires a stalled upload and releases its reserved capacity", async () => {
    const origin = await start();
    const stalled = httpRequest(`${origin}/v2/metadata`, {
      method: "POST",
      headers: {
        ...headers,
        "content-type": "multipart/form-data; boundary=stalled-boundary",
        "content-length": "10000",
      },
    });
    const completion = new Promise<number | undefined>((resolve, reject) => {
      stalled.on("response", (response) => {
        response.resume();
        resolve(response.statusCode);
      });
      stalled.on("error", reject);
    });
    stalled.flushHeaders();
    // Allow the server to admit the request before observing its capacity.
    await vi.waitFor(async () => {
      const overflow = await fetch(`${origin}/v2/metadata`, {
        method: "POST",
        headers,
      });
      expect(overflow.status).toBe(503);
    });
    expect(await completion).toBe(408);
    const recovered = await fetch(`${origin}/v2/metadata`, {
      method: "POST",
      headers,
    });
    expect(recovered.status).toBe(400);
    expect(executeRoute).not.toHaveBeenCalled();
    stalled.destroy();
  });
});
