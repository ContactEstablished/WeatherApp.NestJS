import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import type {
  LocationSuggestion,
  UserPreferences,
} from '@nimbus/shared-types';
import { ReorderSavedLocationsDto } from './dto/reorder-saved-locations.dto';
import { SaveLocationDto } from './dto/save-location.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PreferenceService } from './preference.service';
import { SavedLocationService } from './saved-location.service';

/**
 * Per-user endpoints (#4-#11). Resolves under the global `api` prefix at
 * `/api/users/...`. The mutating saved-location endpoints (#7-#11) return
 * 204 No Content.
 */
@Controller('users')
export class UsersController {
  constructor(
    private readonly preferences: PreferenceService,
    private readonly savedLocations: SavedLocationService,
  ) {}

  // --- preferences (Task 3-4) --------------------------------------------

  /** Endpoint #4 — GET /api/users/:userId/preferences (auto-creates on first read). */
  @Get(':userId/preferences')
  getPreferences(@Param('userId') userId: string): Promise<UserPreferences> {
    return this.preferences.getPreferences(userId);
  }

  /** Endpoint #5 — PUT /api/users/:userId/preferences */
  @Put(':userId/preferences')
  updatePreferences(
    @Param('userId') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    return this.preferences.updatePreferences(userId, dto);
  }

  // --- saved locations (Task 3-5) ----------------------------------------

  /** Endpoint #6 — GET /api/users/:userId/locations (ordered by sortOrder). */
  @Get(':userId/locations')
  listLocations(
    @Param('userId') userId: string,
  ): Promise<LocationSuggestion[]> {
    return this.savedLocations.listLocations(userId);
  }

  /** Endpoint #7 — POST /api/users/:userId/locations -> 204 */
  @Post(':userId/locations')
  @HttpCode(204)
  createLocation(
    @Param('userId') userId: string,
    @Body() dto: SaveLocationDto,
  ): Promise<void> {
    return this.savedLocations.createLocation(userId, dto);
  }

  /**
   * Endpoint #11 — PUT /api/users/:userId/locations/reorder -> 204.
   * Declared before the `:id` routes so `reorder` is not captured as an id.
   */
  @Put(':userId/locations/reorder')
  @HttpCode(204)
  reorderLocations(
    @Param('userId') userId: string,
    @Body() dto: ReorderSavedLocationsDto,
  ): Promise<void> {
    return this.savedLocations.reorderLocations(userId, dto.locationIds);
  }

  /** Endpoint #10 — PUT /api/users/:userId/locations/:id/default -> 204 */
  @Put(':userId/locations/:id/default')
  @HttpCode(204)
  setDefault(
    @Param('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.savedLocations.setDefault(userId, id);
  }

  /** Endpoint #8 — PUT /api/users/:userId/locations/:id -> 204 */
  @Put(':userId/locations/:id')
  @HttpCode(204)
  updateLocation(
    @Param('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveLocationDto,
  ): Promise<void> {
    return this.savedLocations.updateLocation(userId, id, dto);
  }

  /** Endpoint #9 — DELETE /api/users/:userId/locations/:id -> 204 */
  @Delete(':userId/locations/:id')
  @HttpCode(204)
  deleteLocation(
    @Param('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.savedLocations.deleteLocation(userId, id);
  }
}
