import { Module } from "@nestjs/common";

import { ImagesController } from "@/images/images.controller";
import { ImagesService } from "@/images/images.service";
import { V2ImagesController } from "@/images/v2-images.controller";
import { ImageWorkerClient } from "@/worker/image-worker.client";

@Module({
  controllers: [ImagesController, V2ImagesController],
  providers: [ImagesService, ImageWorkerClient],
  exports: [ImageWorkerClient],
})
export class ImagesModule {}
