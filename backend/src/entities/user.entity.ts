import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'display_name' })
  displayName!: string;

  @Column({ type: 'varchar', length: 16, default: 'user' })
  role!: string;

  /** SweetBook bookUid 목록 */
  @Column({ type: 'json', nullable: true, name: 'book_uids' })
  bookUids!: string[] | null;

  /** SweetBook 주문 orderUid 목록 (주문 생성 성공 시 추가) */
  @Column({ type: 'json', nullable: true, name: 'order_uids' })
  orderUids!: string[] | null;

  /** 서비스 내 충전 잔액(원, 정수). 구매 시 이용자 부담 금액(견적의 2배)에서 차감 */
  @Column({ name: 'balance_won', type: 'int', default: 0 })
  balanceWon!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;
}
