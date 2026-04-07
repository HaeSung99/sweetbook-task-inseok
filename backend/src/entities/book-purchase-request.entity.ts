import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type BookPurchaseRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'failed'
  | 'cancelled';

@Entity('book_purchase_requests')
export class BookPurchaseRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  @Column({ name: 'book_uid' })
  bookUid!: string;

  /** 주문 아이템 수량 (기본 1, SweetBook orders.items[].quantity) */
  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: BookPurchaseRequestStatus;

  @Column({ name: 'recipient_name' })
  recipientName!: string;

  @Column({ name: 'recipient_phone' })
  recipientPhone!: string;

  @Column({ name: 'postal_code' })
  postalCode!: string;

  @Column({ name: 'address1' })
  address1!: string;

  @Column({ name: 'address2', type: 'varchar', length: 512, nullable: true })
  address2!: string | null;

  @Column({ name: 'estimate_snapshot', type: 'json', nullable: true })
  estimateSnapshot!: unknown | null;

  /** SweetBook 견적 합계(원) — API·파트너 청구 기준 */
  @Column({ name: 'api_amount_won', type: 'int', nullable: true })
  apiAmountWon!: number | null;

  /** 이용자에게 부과한 금액(원) — 견적 합계의 2배 */
  @Column({ name: 'user_charge_won', type: 'int', nullable: true })
  userChargeWon!: number | null;

  @Column({ name: 'finalize_snapshot', type: 'json', nullable: true })
  finalizeSnapshot!: unknown | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 64, nullable: true })
  idempotencyKey!: string | null;

  @Column({ name: 'sweetbook_order_uid', type: 'varchar', length: 64, nullable: true })
  sweetbookOrderUid!: string | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 500, nullable: true })
  cancelReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}
