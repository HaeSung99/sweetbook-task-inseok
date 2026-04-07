import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLayoutTemplateDto {
  @IsIn(['cover', 'content'])
  kind!: 'cover' | 'content';

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  templateUid!: string;
}
