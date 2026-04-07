import { Allow, IsOptional } from 'class-validator';

export class BlankPageImageOptionsDto {
  @Allow()
  templateUid!: string;

  @Allow()
  @IsOptional()
  breakBefore?: string;

  @Allow()
  @IsOptional()
  parametersExtra?: string;
}
