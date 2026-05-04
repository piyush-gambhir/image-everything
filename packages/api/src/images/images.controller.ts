import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { ImagesService } from "@/images/images.service";
import {
  cleanOptionsSchema,
  compressOptionsSchema,
  convertOptionsSchema,
  cropOptionsSchema,
  resizeOptionsSchema,
  rotateOptionsSchema,
  watermarkOptionsSchema,
} from "@/lib/schemas";
import { ACCEPTED_INPUT_MIMES } from "@/lib/types";
import { sendImageResult } from "@/shared/image-response";
import { parseOptions } from "@/shared/zod-options.pipe";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const uploadConfig = {
  limits: { fileSize: MAX_FILE_SIZE },
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
@Controller("api/images")
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
  @UseInterceptors(FileInterceptor("file", uploadConfig))
  @ApiOperation({
    summary: "Overlay a text watermark",
    description:
      'Options: { kind: "text", text, color: "#RRGGBB", opacity: 0-1, position: "top-left"|"top-right"|"bottom-left"|"bottom-right"|"center", padding }. Image-mode is not yet supported.',
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  async watermark(
    @UploadedFile() file: Express.Multer.File,
    @Body("options") optionsRaw: string | undefined,
    @Res() res: Response,
  ) {
    requireFile(file);
    const options = parseOptions(optionsRaw, watermarkOptionsSchema);
    const result = await this.images.watermark(file.buffer, options);
    sendImageResult(res, result, file.originalname);
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
