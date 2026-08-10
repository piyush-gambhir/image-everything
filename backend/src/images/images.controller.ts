import { randomUUID } from "node:crypto";

import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import {
  V1_OPERATION_MAP,
  getRouteByWorkerPath,
  translateV1Options,
  type V1OperationId,
} from "@image-everything/contracts";

import { ImagesService } from "@/images/images.service";
import {
  assertAggregate,
  multipleUploadOptions,
  pairUploadOptions,
  parseOptionsJson,
  requireMultipleFiles,
  requireSingleFile,
  requireWatermarkFiles,
  singleUploadOptions,
} from "@/shared/multipart";
import { ProblemException, problem } from "@/shared/problem";
import { sendWorkerResponse } from "@/shared/worker-response";
import type {
  WorkerResultKind,
  WorkerUpload,
} from "@/worker/image-worker.client";

type LegacyOperation = V1OperationId;

const LEGACY_ROUTES: Record<LegacyOperation, { kind: WorkerResultKind }> = {
  metadata: { kind: "json" },
  clean: { kind: "image" },
  compress: { kind: "image" },
  resize: { kind: "image" },
  convert: { kind: "image" },
  crop: { kind: "image" },
  rotate: { kind: "image" },
  watermark: { kind: "image" },
  "auto-enhance": { kind: "image" },
  transform: { kind: "image" },
  batch: { kind: "zip" },
};

/**
 * Compatibility surface for the original v1 API. Requests are translated and
 * executed by the same private v2 worker as the canonical API.
 */
@ApiTags("images-v1-compatibility")
@ApiBearerAuth("api-key")
@Controller(["api/v1/images", "api/images"])
export class ImagesController {
  constructor(@Inject(ImagesService) private readonly images: ImagesService) {}

  @Post("metadata")
  @ApiOperation({ summary: "Read image metadata (v1 compatibility)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  metadata(@Req() request: Request, @Res() response: Response) {
    return this.single("metadata", request, response);
  }

  @Post("clean")
  @ApiOperation({ summary: "Clean image metadata (v1 compatibility)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  clean(@Req() request: Request, @Res() response: Response) {
    return this.single("clean", request, response);
  }

  @Post("compress")
  @ApiOperation({ summary: "Compress an image (v1 compatibility)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  compress(@Req() request: Request, @Res() response: Response) {
    return this.single("compress", request, response);
  }

  @Post("resize")
  @ApiOperation({ summary: "Resize an image (v1 compatibility)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  resize(@Req() request: Request, @Res() response: Response) {
    return this.single("resize", request, response);
  }

  @Post("convert")
  @ApiOperation({ summary: "Convert an image (v1 compatibility)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  convert(@Req() request: Request, @Res() response: Response) {
    return this.single("convert", request, response);
  }

  @Post("crop")
  @ApiOperation({ summary: "Crop an image (v1 compatibility)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  crop(@Req() request: Request, @Res() response: Response) {
    return this.single("crop", request, response);
  }

  @Post("rotate")
  @ApiOperation({ summary: "Rotate or flip an image (v1 compatibility)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  rotate(@Req() request: Request, @Res() response: Response) {
    return this.single("rotate", request, response);
  }

  @Post("watermark")
  @ApiOperation({ summary: "Apply a watermark (v1 compatibility)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "file", maxCount: 1 },
        { name: "overlay", maxCount: 1 },
      ],
      pairUploadOptions,
    ),
  )
  async watermark(
    @UploadedFiles()
    fields:
      | { file?: Express.Multer.File[]; overlay?: Express.Multer.File[] }
      | undefined,
    @Body("options") optionsRaw: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const { file, overlay } = requireWatermarkFiles(fields);
    const files = overlay ? [file, overlay] : [file];
    assertAggregate(files, optionsRaw);
    const uploads: WorkerUpload[] = [{ fieldName: "file", file }];
    if (overlay) uploads.push({ fieldName: "overlay", file: overlay });
    await this.forwardLegacy({
      operation: "watermark",
      uploads,
      rawOptions: optionsRaw,
      request,
      response,
      originalName: file.originalname,
    });
  }

  @Post("auto-enhance")
  @ApiOperation({ summary: "Enhance an image (v1 compatibility)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  autoEnhance(@Req() request: Request, @Res() response: Response) {
    return this.single("auto-enhance", request, response);
  }

  @Post("transform")
  @ApiOperation({ summary: "Run a transform pipeline (v1 compatibility)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  transform(@Req() request: Request, @Res() response: Response) {
    return this.single("transform", request, response);
  }

  @Post("batch")
  @ApiOperation({ summary: "Process a batch (v1 compatibility)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("files", undefined, multipleUploadOptions))
  async batch(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const files = requireMultipleFiles(
      request.files as Express.Multer.File[] | undefined,
    );
    const rawOptions = bodyOptions(request);
    assertAggregate(files, rawOptions);
    await this.forwardLegacy({
      operation: "batch",
      uploads: files.map((file) => ({ fieldName: "files", file })),
      rawOptions,
      request,
      response,
      originalName: files[0]?.originalname,
      fallbackZipName: "batch.zip",
    });
  }

  private async single(
    operation: Exclude<LegacyOperation, "watermark" | "batch">,
    request: Request,
    response: Response,
  ): Promise<void> {
    const file = requireSingleFile(request.file);
    const rawOptions = bodyOptions(request);
    assertAggregate([file], rawOptions);
    await this.forwardLegacy({
      operation,
      uploads: [{ fieldName: "file", file }],
      rawOptions,
      request,
      response,
      originalName: file.originalname,
    });
  }

  private async forwardLegacy(args: {
    operation: LegacyOperation;
    uploads: WorkerUpload[];
    rawOptions?: string;
    request: Request;
    response: Response;
    originalName?: string;
    fallbackZipName?: string;
  }): Promise<void> {
    const mapping = LEGACY_ROUTES[args.operation];
    const contract = V1_OPERATION_MAP[args.operation];
    const definition = getRouteByWorkerPath(`/v2/${contract.v2Route}`);
    if (!definition) {
      throw new ProblemException(
        problem({
          status: 500,
          code: "INTERNAL_ERROR",
          detail:
            "The compatibility route is not mapped to a worker operation.",
        }),
      );
    }
    const requestId = requestIdFor(args.request);
    args.response.setHeader("X-Request-Id", requestId);
    const legacyOptions = parseOptionsJson(args.rawOptions);
    const options = translateLegacyOptions(args.operation, legacyOptions);
    const worker = await this.images.execute({
      route: contract.v2Route,
      uploads: args.uploads,
      options,
      requestId,
    });
    await sendWorkerResponse({
      worker,
      response: args.response,
      kind: mapping.kind,
      routeId: definition.id,
      originalName: args.originalName,
      fallbackZipName: args.fallbackZipName,
    });
  }
}

function translateLegacyOptions(
  operation: LegacyOperation,
  options: unknown,
): unknown {
  try {
    return translateV1Options(operation, options);
  } catch (error) {
    const issues = zodIssues(error);
    throw new ProblemException(
      problem({
        status: 422,
        code: "INVALID_OPTIONS",
        detail: `The options field does not match the ${operation} compatibility schema.`,
        errors: issues,
      }),
    );
  }
}

function zodIssues(
  error: unknown,
): Array<{ path: string; message: string }> | undefined {
  if (!error || typeof error !== "object") return undefined;
  const issues = (error as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return undefined;
  return issues.slice(0, 100).flatMap((issue) => {
    if (!issue || typeof issue !== "object") return [];
    const value = issue as { path?: unknown; message?: unknown };
    if (typeof value.message !== "string") return [];
    const path = Array.isArray(value.path)
      ? value.path.map((segment) => String(segment)).join(".")
      : "options";
    return [{ path: path || "options", message: value.message }];
  });
}

function bodyOptions(request: Request): string | undefined {
  const value = (request.body as { options?: unknown } | undefined)?.options;
  return typeof value === "string" ? value : undefined;
}

function requestIdFor(request: Request): string {
  const supplied = request.header("x-request-id");
  return supplied && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied)
    ? supplied
    : randomUUID();
}
