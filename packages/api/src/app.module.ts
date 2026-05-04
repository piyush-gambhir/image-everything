import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { ImagesModule } from "@/images/images.module";
import { ApiKeyGuard } from "@/shared/api-key.guard";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: Number(process.env.RATE_LIMIT_PER_MINUTE) || 120,
      },
    ]),
    ImagesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
