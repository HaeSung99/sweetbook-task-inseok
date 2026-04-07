import { Allow, IsOptional } from 'class-validator';

export class CreateSweetbookBookDto {
  @Allow()
  title!: string;

  @Allow()
  bookSpecUid!: string;

  @Allow()
  @IsOptional()
  creationType?: string;

  @Allow()
  @IsOptional()
  externalRef?: string;

  @Allow()
  @IsOptional()
  specProfileUid?: string;
}
