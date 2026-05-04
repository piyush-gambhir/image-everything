import { Injectable } from "@nestjs/common";

import {
  autoEnhance,
  clean,
  compress,
  convert,
  crop,
  resize,
  rotate,
  transform,
  watermark,
} from "@/lib/engine";
import { readMetadata } from "@/lib/metadata";

@Injectable()
export class ImagesService {
  readMetadata = readMetadata;
  clean = clean;
  compress = compress;
  resize = resize;
  convert = convert;
  crop = crop;
  rotate = rotate;
  watermark = watermark;
  autoEnhance = autoEnhance;
  transform = transform;
}
