import { Allow, IsOptional } from 'class-validator';

export class SweetbookContentsQueryDto {
  @Allow()
  @IsOptional()
  breakBefore?: string;
}
