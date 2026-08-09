import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiKeyGuard } from "@/shared/api-key.guard";
import { Public } from "@/shared/public.decorator";

class TestEndpoints {
  @Public()
  publicRoute() {}

  privateRoute() {}
}

describe("ApiKeyGuard", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("bypasses API key checks for @Public handlers", () => {
    vi.stubEnv("API_KEY", "required-secret");
    const guard = new ApiKeyGuard(new Reflector());
    const context = contextFor(TestEndpoints.prototype.publicRoute, {});

    expect(guard.canActivate(context)).toBe(true);
  });

  it("still requires a configured key on private handlers", () => {
    vi.stubEnv("API_KEY", "required-secret");
    const guard = new ApiKeyGuard(new Reflector());
    const context = contextFor(TestEndpoints.prototype.privateRoute, {
      headers: {},
      query: {},
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it("preserves bearer and query API key authentication", () => {
    vi.stubEnv("API_KEY", "required-secret");
    const guard = new ApiKeyGuard(new Reflector());

    expect(
      guard.canActivate(
        contextFor(TestEndpoints.prototype.privateRoute, {
          headers: { authorization: "Bearer required-secret" },
          query: {},
        }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextFor(TestEndpoints.prototype.privateRoute, {
          headers: {},
          query: { api_key: "required-secret" },
        }),
      ),
    ).toBe(true);
  });
});

function contextFor(
  handler: (...args: never[]) => unknown,
  request: Record<string, unknown>,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => TestEndpoints,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}
