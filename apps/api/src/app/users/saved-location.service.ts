import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  LocationSuggestion,
  SaveLocationRequest,
} from '@nimbus/shared-types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type SavedLocationRow = Prisma.SavedLocationGetPayload<object>;

/**
 * Saved-location logic over the Phase 2 `saved_locations` table (endpoints
 * #6-#11). Enforces the three §0.4 invariants — single default per user,
 * contiguous `sortOrder` on reorder, no duplicate `(userId, name, region)` —
 * and converts the Prisma `Decimal` lat/lon to JSON `number` at the boundary.
 */
@Injectable()
export class SavedLocationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Endpoint #6 — list ordered by sortOrder, Decimal lat/lon -> number. */
  async listLocations(userId: string): Promise<LocationSuggestion[]> {
    const rows = await this.prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((row) => this.toSuggestion(row));
  }

  /** Endpoint #7 — create; assigns the next sortOrder, applies single-default. */
  async createLocation(
    userId: string,
    dto: SaveLocationRequest,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const count = await tx.savedLocation.count({ where: { userId } });
        const created = await tx.savedLocation.create({
          data: {
            userId,
            name: dto.name,
            region: dto.region,
            country: dto.country,
            latitude: new Prisma.Decimal(dto.latitude),
            longitude: new Prisma.Decimal(dto.longitude),
            isDefault: dto.isDefault ?? false,
            sortOrder: count,
          },
        });
        if (dto.isDefault) {
          await tx.savedLocation.updateMany({
            where: { userId, id: { not: created.id } },
            data: { isDefault: false },
          });
        }
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  /** Endpoint #8 — update an existing row; applies single-default. */
  async updateLocation(
    userId: string,
    locationId: number,
    dto: SaveLocationRequest,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.savedLocation.findFirst({
          where: { id: locationId, userId },
        });
        if (!existing) {
          throw new NotFoundException('Saved location not found.');
        }
        await tx.savedLocation.update({
          where: { id: locationId },
          data: {
            name: dto.name,
            region: dto.region,
            country: dto.country,
            latitude: new Prisma.Decimal(dto.latitude),
            longitude: new Prisma.Decimal(dto.longitude),
            isDefault: dto.isDefault ?? false,
          },
        });
        if (dto.isDefault) {
          await tx.savedLocation.updateMany({
            where: { userId, id: { not: locationId } },
            data: { isDefault: false },
          });
        }
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  /** Endpoint #9 — delete (idempotent; scoped to the user). */
  async deleteLocation(userId: string, locationId: number): Promise<void> {
    await this.prisma.savedLocation.deleteMany({
      where: { id: locationId, userId },
    });
  }

  /** Endpoint #10 — atomically set one default and clear it on all others. */
  async setDefault(userId: string, locationId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.savedLocation.findFirst({
        where: { id: locationId, userId },
      });
      if (!existing) {
        throw new NotFoundException('Saved location not found.');
      }
      await tx.savedLocation.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
      await tx.savedLocation.update({
        where: { id: locationId },
        data: { isDefault: true },
      });
    });
  }

  /** Endpoint #11 — rewrite sortOrder contiguously (0,1,2,...) in id order. */
  async reorderLocations(
    userId: string,
    locationIds: number[],
  ): Promise<void> {
    await this.prisma.$transaction(
      locationIds.map((id, index) =>
        this.prisma.savedLocation.updateMany({
          where: { id, userId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  /** Convert a row to the contract shape, Decimal lat/lon -> primitive number. */
  private toSuggestion(row: SavedLocationRow): LocationSuggestion {
    return {
      name: row.name,
      region: row.region,
      country: row.country,
      latitude: row.latitude.toNumber(),
      longitude: row.longitude.toNumber(),
      id: row.id,
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
    };
  }

  /** Map the Phase 2 @@unique violation to 409 Conflict; rethrow anything else. */
  private rethrowConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A saved location with the same name and region already exists.',
      );
    }
    throw error;
  }
}
