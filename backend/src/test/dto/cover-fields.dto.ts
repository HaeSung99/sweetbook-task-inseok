import { Allow, IsOptional } from 'class-validator';

export class SweetbookCoverFieldsDto {
  @Allow()
  templateUid!: string;

  @Allow()
  @IsOptional()
  parameters?: string;
}
