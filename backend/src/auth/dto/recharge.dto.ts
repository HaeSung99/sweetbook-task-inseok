import { IsInt, Max, Min } from 'class-validator';

export class RechargeDto {
  @IsInt()
  @Min(1)
  @Max(50_000_000)
  amount!: number;
}
