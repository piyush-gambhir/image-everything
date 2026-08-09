import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "@/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: [
      "Content-Disposition",
      "X-Output-Format",
      "X-Output-Width",
      "X-Output-Height",
      "X-Output-Size",
      "X-Output-Files",
    ],
  });

  const config = new DocumentBuilder()
    .setTitle("image-everything API")
    .setDescription(
      "Image processing API: read metadata, clean, compress, resize, convert, crop, rotate, watermark, auto-enhance, transform, batch.",
    )
    .setVersion("1.0.0")
    .addTag("images", "Image transformation endpoints")
    .addTag("system", "Health and API capability discovery")
    .addBearerAuth({ type: "http", scheme: "bearer" }, "api-key")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    customSiteTitle: "image-everything API docs",
    jsonDocumentUrl: "/api/openapi.json",
  });

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  console.log(`[api] listening on http://localhost:${port}  (docs: /api/docs)`);
}

bootstrap();
