import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminCancelOrderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  cancelReason!: string;
}
