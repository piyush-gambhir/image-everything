import "reflect-metadata";

import { createApp } from "@/app";

async function bootstrap(): Promise<void> {
  const app = await createApp({ requireWorkerConfig: true });
  const port = Number(process.env.API_PORT ?? process.env.PORT) || 3001;
  await app.listen(port);
  console.log(`[api] listening on http://localhost:${port} (docs: /api/docs)`);
}

void bootstrap();
