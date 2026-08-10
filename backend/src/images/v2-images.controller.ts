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
  applyDecorators,
} from "@nestjs/common";
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { getRouteByWorkerPath } from "@image-everything/contracts";

import { ImagesService } from "@/images/images.service";
import {
  assertAggregate,
  multipleUploadOptions,
  pairUploadOptions,
  parseToolOptions,
  requireCompareFiles,
  requireMultipleFiles,
  requireSingleFile,
  requireWatermarkFiles,
  singleUploadOptions,
} from "@/shared/multipart";
import { sendWorkerResponse } from "@/shared/worker-response";
import { ProblemException, problem } from "@/shared/problem";
import type {
  WorkerResultKind,
  WorkerUpload,
} from "@/worker/image-worker.client";

const singleBody = {
  schema: {
    type: "object",
    required: ["file"],
    properties: {
      file: { type: "string", format: "binary" },
      options: {
        type: "string",
        description: "JSON encoded options from the operation's v2 schema",
      },
    },
  },
};

const watermarkBody = {
  schema: {
    type: "object",
    required: ["file"],
    properties: {
      file: { type: "string", format: "binary" },
      overlay: { type: "string", format: "binary" },
      options: { type: "string" },
    },
  },
};

const multipleBody = {
  schema: {
    type: "object",
    required: ["files"],
    properties: {
      files: {
        type: "array",
        items: { type: "string", format: "binary" },
      },
      options: { type: "string" },
    },
  },
};

const compareBody = {
  schema: {
    type: "object",
    required: ["file", "other"],
    properties: {
      file: { type: "string", format: "binary" },
      other: { type: "string", format: "binary" },
      options: { type: "string" },
    },
  },
};

@ApiTags("images-v2")
@ApiBearerAuth("api-key")
@Controller("api/v2/images")
export class V2ImagesController {
  constructor(@Inject(ImagesService) private readonly images: ImagesService) {}

  @Post("compress")
  @SingleImageRoute("Compress an image", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  compress(@Req() request: Request, @Res() response: Response) {
    return this.single("compress", "image", request, response);
  }

  @Post("compress-to-size")
  @SingleImageRoute("Compress toward a target byte size", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  compressToSize(@Req() request: Request, @Res() response: Response) {
    return this.single("compress-to-size", "image", request, response);
  }

  @Post("resize")
  @SingleImageRoute("Resize an image", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  resize(@Req() request: Request, @Res() response: Response) {
    return this.single("resize", "image", request, response);
  }

  @Post("convert")
  @SingleImageRoute("Convert an image to an explicit output format", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  convert(@Req() request: Request, @Res() response: Response) {
    return this.single("convert", "image", request, response);
  }

  @Post("responsive")
  @SingleImageRoute("Build a responsive image set", "zip")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  responsive(@Req() request: Request, @Res() response: Response) {
    return this.single("responsive", "zip", request, response);
  }

  @Post("quick-enhance")
  @SingleImageRoute("Apply deterministic image enhancement", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  quickEnhance(@Req() request: Request, @Res() response: Response) {
    return this.single("quick-enhance", "image", request, response);
  }

  @Post("crop")
  @SingleImageRoute("Crop an image", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  crop(@Req() request: Request, @Res() response: Response) {
    return this.single("crop", "image", request, response);
  }

  @Post("rotate")
  @SingleImageRoute("Rotate or flip an image", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  rotate(@Req() request: Request, @Res() response: Response) {
    return this.single("rotate", "image", request, response);
  }

  @Post("trim")
  @SingleImageRoute("Trim matching image borders", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  trim(@Req() request: Request, @Res() response: Response) {
    return this.single("trim", "image", request, response);
  }

  @Post("extend")
  @SingleImageRoute("Extend or pad an image canvas", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  extend(@Req() request: Request, @Res() response: Response) {
    return this.single("extend", "image", request, response);
  }

  @Post("alpha")
  @SingleImageRoute("Change or extract image alpha", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  alpha(@Req() request: Request, @Res() response: Response) {
    return this.single("alpha", "image", request, response);
  }

  @Post("adjust")
  @SingleImageRoute("Adjust image color", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  adjust(@Req() request: Request, @Res() response: Response) {
    return this.single("adjust", "image", request, response);
  }

  @Post("normalize")
  @SingleImageRoute("Normalize image tones or apply CLAHE", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  normalize(@Req() request: Request, @Res() response: Response) {
    return this.single("normalize", "image", request, response);
  }

  @Post("filter")
  @SingleImageRoute("Apply a deterministic image filter", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  filter(@Req() request: Request, @Res() response: Response) {
    return this.single("filter", "image", request, response);
  }

  @Post("blur-sharpen")
  @SingleImageRoute("Blur, sharpen, or median-filter an image", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  blurSharpen(@Req() request: Request, @Res() response: Response) {
    return this.single("blur-sharpen", "image", request, response);
  }

  @Post("pixelate")
  @SingleImageRoute("Pixelate an image", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  pixelate(@Req() request: Request, @Res() response: Response) {
    return this.single("pixelate", "image", request, response);
  }

  @Post("watermark")
  @WatermarkRoute()
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
    await this.forward({
      route: "watermark",
      kind: "image",
      uploads,
      optionsRaw,
      request,
      response,
      originalName: file.originalname,
    });
  }

  @Post("frame")
  @SingleImageRoute("Add a frame or rounded corners", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  frame(@Req() request: Request, @Res() response: Response) {
    return this.single("frame", "image", request, response);
  }

  @Post("collage")
  @MultipleImageRoute("Build a collage or contact sheet", "image")
  @UseInterceptors(FilesInterceptor("files", undefined, multipleUploadOptions))
  collage(@Req() request: Request, @Res() response: Response) {
    return this.multiple("collage", "image", 2, request, response);
  }

  @Post("metadata")
  @SingleImageRoute("Inspect recognized image metadata", "json")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  metadata(@Req() request: Request, @Res() response: Response) {
    return this.single("metadata", "json", request, response);
  }

  @Post("metadata/clean")
  @SingleImageRoute("Clean image metadata", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  cleanMetadata(@Req() request: Request, @Res() response: Response) {
    return this.single("metadata/clean", "image", request, response);
  }

  @Post("metadata/edit")
  @SingleImageRoute("Write whitelisted image metadata", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  editMetadata(@Req() request: Request, @Res() response: Response) {
    return this.single("metadata/edit", "image", request, response);
  }

  @Post("analyze/stats")
  @SingleImageRoute("Analyze image statistics", "json")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  stats(@Req() request: Request, @Res() response: Response) {
    return this.single("analyze/stats", "json", request, response);
  }

  @Post("analyze/palette")
  @SingleImageRoute("Extract an image palette", "json")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  palette(@Req() request: Request, @Res() response: Response) {
    return this.single("analyze/palette", "json", request, response);
  }

  @Post("analyze/histogram")
  @SingleImageRoute("Build an image histogram", "json")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  histogram(@Req() request: Request, @Res() response: Response) {
    return this.single("analyze/histogram", "json", request, response);
  }

  @Post("analyze/compare")
  @CompareRoute("Compare two images", "json")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "file", maxCount: 1 },
        { name: "other", maxCount: 1 },
      ],
      pairUploadOptions,
    ),
  )
  compare(@Req() request: Request, @Res() response: Response) {
    return this.compareFiles("analyze/compare", "json", request, response);
  }

  @Post("analyze/compare/diff")
  @CompareRoute("Render a PNG difference view", "image")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "file", maxCount: 1 },
        { name: "other", maxCount: 1 },
      ],
      pairUploadOptions,
    ),
  )
  compareDiff(@Req() request: Request, @Res() response: Response) {
    return this.compareFiles(
      "analyze/compare/diff",
      "image",
      request,
      response,
    );
  }

  @Post("process")
  @SingleImageRoute("Run a validated single-encode pipeline", "image")
  @UseInterceptors(FileInterceptor("file", singleUploadOptions))
  process(@Req() request: Request, @Res() response: Response) {
    return this.single("process", "image", request, response);
  }

  @Post("batch")
  @MultipleImageRoute("Run one pipeline over multiple images", "zip")
  @UseInterceptors(FilesInterceptor("files", undefined, multipleUploadOptions))
  batch(@Req() request: Request, @Res() response: Response) {
    return this.multiple("batch", "zip", 1, request, response);
  }

  private async single(
    route: string,
    kind: WorkerResultKind,
    request: Request,
    response: Response,
  ): Promise<void> {
    const file = requireSingleFile(request.file);
    const optionsRaw = bodyOptions(request);
    assertAggregate([file], optionsRaw);
    await this.forward({
      route,
      kind,
      uploads: [{ fieldName: "file", file }],
      optionsRaw,
      request,
      response,
      originalName: file.originalname,
      fallbackZipName:
        route === "responsive" ? "responsive-images.zip" : undefined,
    });
  }

  private async multiple(
    route: string,
    kind: WorkerResultKind,
    minimum: number,
    request: Request,
    response: Response,
  ): Promise<void> {
    const files = requireMultipleFiles(
      request.files as Express.Multer.File[] | undefined,
      minimum,
    );
    const optionsRaw = bodyOptions(request);
    assertAggregate(files, optionsRaw);
    await this.forward({
      route,
      kind,
      uploads: files.map((file) => ({ fieldName: "files", file })),
      optionsRaw,
      request,
      response,
      originalName: files[0]?.originalname,
      fallbackZipName: route === "batch" ? "batch.zip" : undefined,
    });
  }

  private async compareFiles(
    route: string,
    kind: WorkerResultKind,
    request: Request,
    response: Response,
  ): Promise<void> {
    const fields = request.files as
      | { file?: Express.Multer.File[]; other?: Express.Multer.File[] }
      | undefined;
    const optionsRaw = bodyOptions(request);
    const { file, other } = requireCompareFiles(fields);
    assertAggregate([file, other], optionsRaw);
    await this.forward({
      route,
      kind,
      uploads: [
        { fieldName: "file", file },
        { fieldName: "other", file: other },
      ],
      optionsRaw,
      request,
      response,
      originalName: file.originalname,
    });
  }

  private async forward(args: {
    route: string;
    kind: WorkerResultKind;
    uploads: WorkerUpload[];
    optionsRaw?: string;
    request: Request;
    response: Response;
    originalName?: string;
    fallbackZipName?: string;
  }): Promise<void> {
    const definition = getRouteByWorkerPath(`/v2/${args.route}`);
    if (!definition || definition.resultKind !== args.kind) {
      throw new ProblemException(
        problem({
          status: 500,
          code: "INTERNAL_ERROR",
          detail: "The API route is not mapped to a valid worker operation.",
        }),
      );
    }
    const options = parseToolOptions(definition.toolId, args.optionsRaw);
    assertUploadContract(definition.toolId, options, args.uploads);
    const requestId = requestIdFor(args.request);
    args.response.setHeader("X-Request-Id", requestId);
    const worker = await this.images.execute({
      route: args.route,
      uploads: args.uploads,
      options,
      requestId,
    });
    await sendWorkerResponse({
      worker,
      response: args.response,
      kind: args.kind,
      routeId: definition.id,
      originalName: args.originalName,
      fallbackZipName: args.fallbackZipName,
    });
  }
}

function assertUploadContract(
  toolId: string,
  options: unknown,
  uploads: WorkerUpload[],
): void {
  if (toolId !== "watermark") return;
  const kind = (options as { kind: "image" | "text" }).kind;
  const hasOverlay = uploads.some((upload) => upload.fieldName === "overlay");
  if ((kind === "image") !== hasOverlay) {
    throw new ProblemException(
      problem({
        status: 422,
        code: "INVALID_OPERATION_COMBINATION",
        detail:
          kind === "image"
            ? 'Image watermark options require an "overlay" upload.'
            : "Text watermark options cannot be combined with an overlay upload.",
      }),
    );
  }
}

function SingleImageRoute(summary: string, kind: WorkerResultKind) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiConsumes("multipart/form-data"),
    ApiBody(singleBody),
    ApiProduces(
      kind === "json"
        ? "application/json"
        : kind === "zip"
          ? "application/zip"
          : "image/*",
    ),
  );
}

function WatermarkRoute() {
  return applyDecorators(
    ApiOperation({ summary: "Apply a text or image watermark" }),
    ApiConsumes("multipart/form-data"),
    ApiBody(watermarkBody),
    ApiProduces("image/*"),
  );
}

function MultipleImageRoute(summary: string, kind: WorkerResultKind) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiConsumes("multipart/form-data"),
    ApiBody(multipleBody),
    ApiProduces(kind === "zip" ? "application/zip" : "image/*"),
  );
}

function CompareRoute(summary: string, kind: WorkerResultKind) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiConsumes("multipart/form-data"),
    ApiBody(compareBody),
    ApiProduces(kind === "json" ? "application/json" : "image/png"),
  );
}

function requestIdFor(request: Request): string {
  const supplied = request.header("x-request-id");
  return supplied && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied)
    ? supplied
    : randomUUID();
}

function bodyOptions(request: Request): string | undefined {
  const value = (request.body as { options?: unknown } | undefined)?.options;
  return typeof value === "string" ? value : undefined;
}
