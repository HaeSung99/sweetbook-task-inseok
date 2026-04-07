import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class PurchaseShippingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  recipientName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  recipientPhone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(16)
  postalCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address2?: string;

  /** 주문 수량 (미입력 시 1) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;
}
