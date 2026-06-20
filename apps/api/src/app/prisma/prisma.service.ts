import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Single injectable Prisma access point for the whole API.
 *
 * Extends the Phase 2 generated client (`@prisma/client`) so the typed
 * `userPreference` / `savedLocation` accessors are available by inheritance.
 * Opens the connection on module init and closes it on shutdown.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
