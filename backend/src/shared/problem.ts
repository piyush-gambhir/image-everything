import { HttpException, HttpStatus } from "@nestjs/common";
import type { ErrorCode, Problem } from "@image-everything/contracts";

export type ProblemDocument = Problem;
export type ProblemInput = Omit<ProblemDocument, "instance">;
export type ProblemError = NonNullable<ProblemDocument["errors"]>[number];

export class ProblemException extends HttpException {
  constructor(public readonly problem: ProblemInput) {
    super(problem, problem.status);
  }
}

export function problem(args: {
  status: number;
  code: ErrorCode;
  detail: string;
  title?: string;
  retryable?: boolean;
  errors?: ProblemError[];
}): ProblemInput {
  return {
    type: `https://image-everything.dev/problems/${args.code
      .toLowerCase()
      .replace(/_/g, "-")}`,
    title: args.title ?? titleForStatus(args.status),
    status: args.status,
    code: args.code,
    detail: args.detail,
    retryable:
      args.retryable ??
      [
        HttpStatus.TOO_MANY_REQUESTS,
        HttpStatus.BAD_GATEWAY,
        HttpStatus.SERVICE_UNAVAILABLE,
        HttpStatus.GATEWAY_TIMEOUT,
      ].includes(args.status),
    ...(args.errors ? { errors: args.errors } : {}),
  };
}

export function titleForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "Bad Request";
    case HttpStatus.UNAUTHORIZED:
      return "Unauthorized";
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return "Payload Too Large";
    case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
      return "Unsupported Media Type";
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return "Unprocessable Entity";
    case HttpStatus.TOO_MANY_REQUESTS:
      return "Too Many Requests";
    case HttpStatus.BAD_GATEWAY:
      return "Bad Gateway";
    case HttpStatus.SERVICE_UNAVAILABLE:
      return "Service Unavailable";
    case HttpStatus.GATEWAY_TIMEOUT:
      return "Gateway Timeout";
    default:
      return "Internal Server Error";
  }
}

export function defaultProblemCode(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "MALFORMED_MULTIPART";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return "UPLOAD_TOO_LARGE";
    case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
      return "UNSUPPORTED_MEDIA_TYPE";
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return "INVALID_OPTIONS";
    case HttpStatus.TOO_MANY_REQUESTS:
      return "RATE_LIMITED";
    case HttpStatus.BAD_GATEWAY:
      return "WORKER_BAD_RESPONSE";
    case HttpStatus.SERVICE_UNAVAILABLE:
      return "WORKER_UNAVAILABLE";
    case HttpStatus.GATEWAY_TIMEOUT:
      return "EXECUTION_TIMEOUT";
    default:
      return "INTERNAL_ERROR";
  }
}
