import type { UnitSystem, UpdatePreferencesRequest } from '@nimbus/shared-types';
import { IsIn } from 'class-validator';

/**
 * Request body for endpoint #5. Implements the shared contract interface and
 * adds only validation — no field redeclaration. Under the global pipe
 * (whitelist + forbidNonWhitelisted) an unknown field or an out-of-range
 * `unitSystem` is rejected with 400.
 */
export class UpdatePreferencesDto implements UpdatePreferencesRequest {
  @IsIn(['imperial', 'metric'])
  unitSystem!: UnitSystem;
}
