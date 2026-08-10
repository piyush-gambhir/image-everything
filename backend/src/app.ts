import type { INestApplication, LogLevel } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "@/app.module";
import { ProblemFilter } from "@/shared/problem.filter";
import { ImageWorkerClient } from "@/worker/image-worker.client";

export type CreateAppOptions = {
  logger?: false | LogLevel[];
  requireWorkerConfig?: boolean;
};

export async function createApp(
  options: CreateAppOptions = {},
): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: options.logger,
  });

  app.useGlobalFilters(new ProblemFilter());
  app.enableCors({
    origin: corsOrigins(),
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: [
      "Content-Disposition",
      "X-Output-Format",
      "X-Output-Width",
      "X-Output-Height",
      "X-Output-Size",
      "X-Output-Files",
      "X-Input-Size",
      "X-Compression-Ratio",
      "X-Image-Worker-Protocol",
      "X-Image-Output-Format",
      "X-Image-Output-Width",
      "X-Image-Output-Height",
      "X-Image-Output-Bytes",
      "X-Image-Output-Files",
      "X-Image-Capability-Fingerprint",
      "X-Request-Id",
      "Retry-After",
    ],
  });

  const config = new DocumentBuilder()
    .setTitle("Image Everything API")
    .setDescription(
      "Authenticated multipart gateway for the Image Everything still-image worker.",
    )
    .setVersion("2.0.0")
    .addTag("images-v2", "Canonical v2 image operations")
    .addTag("images-v1-compatibility", "Backwards-compatible v1 operations")
    .addTag("system", "Health, readiness, and runtime capabilities")
    .addBearerAuth({ type: "http", scheme: "bearer" }, "api-key")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    customSiteTitle: "Image Everything API docs",
    jsonDocumentUrl: "/api/openapi.json",
  });

  if (options.requireWorkerConfig) {
    app.get(ImageWorkerClient).assertConfigured();
  }
  return app;
}

function corsOrigins(): true | string[] {
  const configured = process.env.CORS_ORIGIN;
  if (!configured?.trim()) return ["http://localhost:3000"];
  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
