import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { API_VERSION, getCapabilities } from "@/shared/api-contract";
import { Public } from "@/shared/public.decorator";

@ApiTags("system")
@Controller("api")
export class SystemController {
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
}
