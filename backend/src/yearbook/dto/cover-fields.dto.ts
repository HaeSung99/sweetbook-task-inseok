import { Allow, IsOptional } from 'class-validator';

export class YearbookCoverFieldsDto {
  @Allow()
  templateUid!: string;

  @Allow()
  @IsOptional()
  parameters?: string;
}
