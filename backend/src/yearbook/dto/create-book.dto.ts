import { Allow, IsOptional } from 'class-validator';

export class CreateYearbookBookDto {
  @Allow()
  title!: string;

  @Allow()
  @IsOptional()
  bookSpecUid?: string;
}
