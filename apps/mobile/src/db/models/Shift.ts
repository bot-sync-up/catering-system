import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class ShiftModel extends Model {
  static table = 'shifts';

  @field('user_id') userId!: string;
  @date('start_at') startAt!: Date;
  @date('end_at') endAt?: Date;
  @field('role') role!: string;
  @date('updated_at') updatedAt!: Date;
  @field('is_dirty') isDirty!: boolean;
}
