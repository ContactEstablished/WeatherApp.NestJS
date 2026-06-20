import type { SaveLocationRequest } from '@nimbus/shared-types';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Request body for endpoints #7 and #8 (UpdateSavedLocationRequest is the same
 * shape). Implements the shared contract interface and adds only validation.
 */
export class SaveLocationDto implements SaveLocationRequest {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  region!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
