import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class OrderModel extends Model {
  static table = 'orders';

  @field('customer_id') customerId!: string;
  @field('status') status!: string;
  @field('total') total!: number;
  @date('paid_at') paidAt?: Date;
  @date('updated_at') updatedAt!: Date;
  @date('server_updated_at') serverUpdatedAt?: Date;
  @field('is_dirty') isDirty!: boolean;
}
