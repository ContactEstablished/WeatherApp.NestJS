import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import type { UserPreferences } from '@nimbus/shared-types';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PreferenceService } from './preference.service';

/**
 * Per-user endpoints. Resolves under the global `api` prefix at `/api/users/...`.
 * Endpoints #4/#5 (preferences) live here; #6-#11 (saved locations) are added
 * in Task 3-5.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly preferences: PreferenceService) {}

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
}
