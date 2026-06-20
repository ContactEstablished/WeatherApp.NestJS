import { Module } from '@nestjs/common';
import { PreferenceService } from './preference.service';
import { SavedLocationService } from './saved-location.service';
import { UsersController } from './users.controller';

/**
 * UsersModule — endpoints #4-#11: preferences (PreferenceService) and saved
 * locations (SavedLocationService).
 */
@Module({
  controllers: [UsersController],
  providers: [PreferenceService, SavedLocationService],
})
export class UsersModule {}
