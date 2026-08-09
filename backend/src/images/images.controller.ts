import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
  UnsupportedMediaTypeException,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from "@nestjs/platform-express";
import archiver from "archiver";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { ImagesService } from "@/images/images.service";
import {
  autoEnhanceOptionsSchema,
  cleanOptionsSchema,
  compressOptionsSchema,
  convertOptionsSchema,
  cropOptionsSchema,
  resizeOptionsSchema,
  rotateOptionsSchema,
  transformOptionsSchema,
  watermarkOptionsSchema,
} from "@/lib/schemas";
import { ACCEPTED_INPUT_MIMES } from "@/lib/types";
import { MAX_BATCH_FILES, MAX_UPLOAD_BYTES } from "@/shared/api-contract";
import {
  attachmentHeader,
  outputFilename,
  safeFilenameBase,
  sendImageResult,
} from "@/shared/image-response";
import { parseOptions } from "@/shared/zod-options.pipe";

const uploadConfig = {
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (err: Error | null, accept: boolean) => void,
  ) => {
    if (!ACCEPTED_INPUT_MIMES.includes(file.mimetype)) {
      cb(
        new UnsupportedMediaTypeException(
          `Unsupported file type: ${file.mimetype}`,
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
};

const fileBody = {
  schema: {
    type: "object",
    properties: {
      file: { type: "string", format: "binary" },
      options: {
        type: "string",
        description:
          "JSON-encoded options for this operation. See schema in description.",
      },
    },
    required: ["file"],
  },
};

@ApiTags("images")
@Controller(["api/v1/images", "api/images"])
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Post("metadata")
  @UseInterceptors(FileInterceptor("file", uploadConfig))
  @ApiOperation({
    summary: "Read EXIF / IPTC / XMP / GPS metadata + format basics",
    description:
      "Returns format, dimensions, channel info, raw blocks (ifd0, exif, iptc, xmp, gps, icc), and a categorized view (camera, lens, exposure, image, location, other).",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
      required: ["file"],
    },
  })
  async metadata(@UploadedFile() file: Express.Multer.File) {
    requireFile(file);
    return this.images.readMetadata(file.buffer);
  }

  @Post("clean")
  @UseInterceptors(FileInterceptor("file", uploadConfig))
  @ApiOperation({
    summary: "Strip EXIF / IPTC / XMP / ICC metadata",
    description:
      'Re-encodes without metadata. Bakes EXIF orientation into pixels by default. Options: { keep?: ("orientation"|"colorProfile")[] }.',
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  async clean(
    @UploadedFile() file: Express.Multer.File,
    @Body("options") optionsRaw: string | undefined,
    @Res() res: Response,
  ) {
    requireFile(file);
    const options = parseOptions(optionsRaw, cleanOptionsSchema);
    const result = await this.images.clean(file.buffer, options);
    sendImageResult(res, result, file.originalname);
  }

  @Post("compress")
  @UseInterceptors(FileInterceptor("file", uploadConfig))
  @ApiOperation({
    summary: "Compress with quality control",
    description:
      'Options: { format?: "auto"|"jpeg"|"png"|"webp"|"avif", quality?: 1-100, lossless?: boolean, mozjpeg?: boolean }.',
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  async compress(
    @UploadedFile() file: Express.Multer.File,
    @Body("options") optionsRaw: string | undefined,
    @Res() res: Response,
  ) {
    requireFile(file);
    const options = parseOptions(optionsRaw, compressOptionsSchema);
    const result = await this.images.compress(file.buffer, options);
    sendImageResult(res, result, file.originalname);
  }

  @Post("resize")
  @UseInterceptors(FileInterceptor("file", uploadConfig))
  @ApiOperation({
    summary: "Resize with five fit modes",
    description:
      'Options: { width?, height?, fit: "cover"|"contain"|"fill"|"inside"|"outside", background?: "#RRGGBB", withoutEnlargement?: boolean }. At least one of width/height required.',
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  async resize(
    @UploadedFile() file: Express.Multer.File,
    @Body("options") optionsRaw: string | undefined,
    @Res() res: Response,
  ) {
    requireFile(file);
    const options = parseOptions(optionsRaw, resizeOptionsSchema);
    const result = await this.images.resize(file.buffer, options);
    sendImageResult(res, result, file.originalname);
  }

  @Post("convert")
  @UseInterceptors(FileInterceptor("file", uploadConfig))
  @ApiOperation({
    summary: "Convert format",
    description:
      'Options: { targetFormat: "jpeg"|"png"|"webp"|"avif"|"gif", quality?, background?: "#RRGGBB" }. Background is used to flatten alpha when targeting JPEG.',
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  async convert(
    @UploadedFile() file: Express.Multer.File,
    @Body("options") optionsRaw: string | undefined,
    @Res() res: Response,
  ) {
    requireFile(file);
    const options = parseOptions(optionsRaw, convertOptionsSchema);
    const result = await this.images.convert(file.buffer, options);
    sendImageResult(res, result, file.originalname);
  }

  @Post("crop")
  @UseInterceptors(FileInterceptor("file", uploadConfig))
  @ApiOperation({
    summary: "Crop a rectangular region",
    description:
      "Options: { left, top, width, height } in pixels. Region must be inside the image.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  async crop(
    @UploadedFile() file: Express.Multer.File,
    @Body("options") optionsRaw: string | undefined,
    @Res() res: Response,
  ) {
    requireFile(file);
    const options = parseOptions(optionsRaw, cropOptionsSchema);
    const result = await this.images.crop(file.buffer, options);
    sendImageResult(res, result, file.originalname);
  }

  @Post("rotate")
  @UseInterceptors(FileInterceptor("file", uploadConfig))
  @ApiOperation({
    summary: "Rotate and / or flip",
    description:
      "Options: { angle: 0|90|180|270, flipH?: boolean, flipV?: boolean }.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  async rotate(
    @UploadedFile() file: Express.Multer.File,
    @Body("options") optionsRaw: string | undefined,
    @Res() res: Response,
  ) {
    requireFile(file);
    const options = parseOptions(optionsRaw, rotateOptionsSchema);
    const result = await this.images.rotate(file.buffer, options);
    sendImageResult(res, result, file.originalname);
  }

  @Post("watermark")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "file", maxCount: 1 },
        { name: "overlay", maxCount: 1 },
      ],
      uploadConfig,
    ),
  )
  @ApiOperation({
    summary: "Overlay a text or image watermark",
    description:
      'Options: { kind: "text"|"image", ... }. For "text", supply text/color/opacity/position/padding. For "image", supply opacity/position/padding and a second multipart field named "overlay" containing the overlay image.',
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        overlay: { type: "string", format: "binary" },
        options: { type: "string" },
      },
      required: ["file"],
    },
  })
  async watermark(
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; overlay?: Express.Multer.File[] },
    @Body("options") optionsRaw: string | undefined,
    @Res() res: Response,
  ) {
    const file = files.file?.[0];
    requireFile(file);
    const overlay = files.overlay?.[0];
    const options = parseOptions(optionsRaw, watermarkOptionsSchema);
    if (options.kind === "image" && !overlay) {
      throw new BadRequestException({
        error: 'Image watermark requires an "overlay" file',
      });
    }
    const result = await this.images.watermark(
      file.buffer,
      options,
      overlay?.buffer,
    );
    sendImageResult(res, result, file.originalname);
  }

  @Post("auto-enhance")
  @UseInterceptors(FileInterceptor("file", uploadConfig))
  @ApiOperation({
    summary: "Auto-orient + auto-enhance",
    description:
      "Bakes EXIF orientation, optionally normalizes contrast, modulates brightness/saturation/hue, and sharpens. Options: { normalize?: boolean, brightness?: number, saturation?: number, hue?: number, sharpen?: boolean }.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  async autoEnhance(
    @UploadedFile() file: Express.Multer.File,
    @Body("options") optionsRaw: string | undefined,
    @Res() res: Response,
  ) {
    requireFile(file);
    const options = parseOptions(optionsRaw, autoEnhanceOptionsSchema);
    const result = await this.images.autoEnhance(file.buffer, options);
    sendImageResult(res, result, file.originalname);
  }

  @Post("transform")
  @UseInterceptors(FileInterceptor("file", uploadConfig))
  @ApiOperation({
    summary: "Run a chain of operations in one pipeline",
    description:
      'Options: { ops: [{ op: "resize"|"rotate"|"crop"|"convert"|"compress"|"autoEnhance"|"clean", options: {...} }, ...] }. Runs in a single sharp pipeline (one decode, one encode).',
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  async transform(
    @UploadedFile() file: Express.Multer.File,
    @Body("options") optionsRaw: string | undefined,
    @Res() res: Response,
  ) {
    requireFile(file);
    const options = parseOptions(optionsRaw, transformOptionsSchema);
    const result = await this.images.transform(file.buffer, options.ops);
    sendImageResult(res, result, file.originalname);
  }

  @Post("batch")
  @UseInterceptors(FilesInterceptor("files", MAX_BATCH_FILES, uploadConfig))
  @ApiOperation({
    summary: "Apply a transform chain to many files, return a zip",
    description:
      'Up to 20 files in a single "files" multipart field. Options is the same shape as /transform: { ops: [...] }. Response is a zip with the processed outputs named after their inputs.',
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
        options: { type: "string" },
      },
      required: ["files"],
    },
  })
  async batch(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body("options") optionsRaw: string | undefined,
    @Res() res: Response,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException({
        error: 'Provide at least one file in "files"',
      });
    }
    const options = parseOptions(optionsRaw, transformOptionsSchema);
    const archive = archiver("zip", { zlib: { level: 9 } });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", attachmentHeader("batch.zip"));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Output-Files", String(files.length));
    archive.pipe(res);
    archive.on("error", (err) => res.destroy(err));
    for (const file of files) {
      try {
        const result = await this.images.transform(file.buffer, options.ops);
        archive.append(result.buffer, {
          name: outputFilename(file.originalname || "image", result.format),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        archive.append(
          Buffer.from(
            `Failed to process ${safeFilenameBase(file.originalname)}: ${message}\n`,
          ),
          { name: `errors/${safeFilenameBase(file.originalname)}.txt` },
        );
      }
    }
    await archive.finalize();
  }
}

function requireFile(
  file: Express.Multer.File | undefined,
): asserts file is Express.Multer.File {
  if (!file) {
    throw new BadRequestException({ error: 'Missing "file" field in request' });
  }
  if (file.size === 0) {
    throw new BadRequestException({ error: "Uploaded file is empty" });
  }
}
