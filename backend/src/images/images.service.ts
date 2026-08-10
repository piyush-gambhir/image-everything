import { Inject, Injectable } from "@nestjs/common";

import {
  ImageWorkerClient,
  type WorkerExecution,
} from "@/worker/image-worker.client";

@Injectable()
export class ImagesService {
  constructor(
    @Inject(ImageWorkerClient) private readonly worker: ImageWorkerClient,
  ) {}

  execute(input: WorkerExecution): Promise<Response> {
    return this.worker.execute(input);
  }
}
