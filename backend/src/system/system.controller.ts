import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { API_VERSION, getCapabilities } from "@/shared/api-contract";
import { Public } from "@/shared/public.decorator";
import { ImageWorkerClient } from "@/worker/image-worker.client";

@ApiTags("system")
@Controller("api")
export class SystemController {
  constructor(
    @Inject(ImageWorkerClient)
    private readonly worker: ImageWorkerClient = new ImageWorkerClient(),
  ) {}

  @Public()
  @Get("health")
  @ApiOperation({ summary: "Check whether the API is ready" })
  @ApiOkResponse({
    schema: {
      example: {
        status: "ok",
        service: "image-everything",
        apiVersion: "v1",
      },
    },
  })
  health() {
    return {
      status: "ok" as const,
      service: "image-everything" as const,
      apiVersion: API_VERSION,
    };
  }

  @Public()
  @Get(`${API_VERSION}/capabilities`)
  @ApiOperation({ summary: "Describe operations, codecs, and API limits" })
  capabilities() {
    return getCapabilities();
  }

  @Public()
  @Get("ready")
  @ApiOperation({
    summary: "Check whether the API and private image worker are ready",
  })
  async ready() {
    return this.worker.ready();
  }

  @Public()
  @Get("v2/capabilities")
  @ApiOperation({ summary: "Proxy runtime-probed v2 worker capabilities" })
  async v2Capabilities() {
    return this.worker.capabilities();
  }
}
