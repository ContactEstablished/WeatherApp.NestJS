import { Module } from '@nestjs/common';
import { PreferenceService } from './preference.service';
import { UsersController } from './users.controller';

/**
 * UsersModule — endpoints #4-#11. This task wires preferences (#4/#5);
 * Task 3-5 extends the controller and service with saved locations (#6-#11).
 */
@Module({
  controllers: [UsersController],
  providers: [PreferenceService],
})
export class UsersModule {}
