import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type LayoutTemplateKind = 'cover' | 'content';

@Entity('layout_templates')
@Unique(['kind', 'templateUid'])
export class LayoutTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 16 })
  kind!: LayoutTemplateKind;

  @Column({ name: 'template_uid', type: 'varchar', length: 256 })
  templateUid!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
