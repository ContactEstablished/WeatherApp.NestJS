import { Injectable } from '@nestjs/common';
import type {
  UnitSystem,
  UpdatePreferencesRequest,
  UserPreferences,
} from '@nimbus/shared-types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Prisma-backed preferences over the Phase 2 `user_preferences` table.
 * Enforces the §0.4 invariant: a `UserPreference` is auto-created with
 * `unitSystem = 'imperial'` on first read.
 */
@Injectable()
export class PreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<UserPreferences> {
    const existing = await this.prisma.userPreference.findUnique({
      where: { userId },
    });
    if (existing) {
      return this.toContract(existing.userId, existing.unitSystem);
    }

    const created = await this.prisma.userPreference.create({
      data: { userId, unitSystem: 'imperial' },
    });
    return this.toContract(created.userId, created.unitSystem);
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesRequest,
  ): Promise<UserPreferences> {
    const row = await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, unitSystem: dto.unitSystem },
      update: { unitSystem: dto.unitSystem },
    });
    return this.toContract(row.userId, row.unitSystem);
  }

  /** Map a row to the `{ userId, unitSystem }` contract (no timestamps). */
  private toContract(userId: string, unitSystem: string): UserPreferences {
    return { userId, unitSystem: unitSystem as UnitSystem };
  }
}
