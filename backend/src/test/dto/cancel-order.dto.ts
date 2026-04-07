import { Allow, IsOptional } from 'class-validator';

export class CancelOrderDto {
  @Allow()
  @IsOptional()
  cancelReason?: string;
}
