import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const required = process.env.API_KEY;
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.headers["authorization"];
    const provided =
      typeof auth === "string" ? auth.replace(/^Bearer\s+/i, "").trim() : "";
    const queryKey =
      typeof request.query?.api_key === "string"
        ? (request.query.api_key as string)
        : "";
    const supplied = provided || queryKey;

    if (!supplied) {
      throw new UnauthorizedException({
        error:
          "Missing API key. Send Authorization: Bearer <key> or ?api_key=<key>.",
      });
    }
    if (!safeCompare(supplied, required)) {
      this.logger.warn(
        `Rejected request with invalid API key from ${request.ip}`,
      );
      throw new UnauthorizedException({ error: "Invalid API key" });
    }
    return true;
  }
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
