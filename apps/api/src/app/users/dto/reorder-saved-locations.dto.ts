import type { ReorderSavedLocationsRequest } from '@nimbus/shared-types';
import { IsArray, IsInt } from 'class-validator';

/**
 * Request body for endpoint #11 — the desired order of saved-location ids.
 */
export class ReorderSavedLocationsDto implements ReorderSavedLocationsRequest {
  @IsArray()
  @IsInt({ each: true })
  locationIds!: number[];
}
