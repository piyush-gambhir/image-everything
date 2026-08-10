import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

import {
  ProblemException,
  defaultProblemCode,
  problem,
  type ProblemDocument,
} from "@/shared/problem";

@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const document = this.toProblem(error, request.originalUrl || request.url);

    if (document.status >= 500 && !(error instanceof ProblemException)) {
      this.logger.error(
        `Request failed: ${request.method} ${request.originalUrl || request.url}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    response
      .status(document.status)
      .type("application/problem+json")
      .setHeader("Cache-Control", "no-store")
      .setHeader("X-Content-Type-Options", "nosniff")
      .send(document);
  }

  private toProblem(error: unknown, instance: string): ProblemDocument {
    if (error instanceof ProblemException) {
      return { ...error.problem, instance };
    }

    if (isMulterError(error)) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      const tooMany = error.code === "LIMIT_FILE_COUNT";
      const status =
        tooLarge || tooMany
          ? HttpStatus.PAYLOAD_TOO_LARGE
          : HttpStatus.BAD_REQUEST;
      return {
        ...problem({
          status,
          code: tooLarge
            ? "UPLOAD_TOO_LARGE"
            : tooMany
              ? "TOO_MANY_FILES"
              : "MALFORMED_MULTIPART",
          detail: tooLarge
            ? "An uploaded file exceeds the configured byte limit."
            : tooMany
              ? "The multipart request contains too many files."
              : "The multipart request is malformed or exceeds its field limits.",
        }),
        instance,
      };
    }

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body = error.getResponse();
      const detail = httpExceptionDetail(body, status);
      const errors =
        typeof body === "object" &&
        body !== null &&
        Array.isArray((body as { errors?: unknown }).errors)
          ? (body as { errors: Array<{ path: string; message: string }> })
              .errors
          : undefined;
      return {
        ...problem({
          status,
          code: defaultProblemCode(status),
          detail,
          errors,
        }),
        instance,
      };
    }

    return {
      ...problem({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: "INTERNAL_ERROR",
        detail: "The server could not complete the request.",
      }),
      instance,
    };
  }
}

function httpExceptionDetail(body: string | object, status: number): string {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    const value = body as {
      detail?: unknown;
      error?: unknown;
      message?: unknown;
    };
    if (typeof value.detail === "string") return value.detail;
    if (typeof value.error === "string") return value.error;
    if (typeof value.message === "string") return value.message;
    if (Array.isArray(value.message)) return value.message.join("; ");
  }
  return status >= 500
    ? "The server could not complete the request."
    : "The request could not be processed.";
}

function isMulterError(error: unknown): error is Error & { code: string } {
  return (
    error instanceof Error &&
    error.name === "MulterError" &&
    typeof (error as Error & { code?: unknown }).code === "string"
  );
}
