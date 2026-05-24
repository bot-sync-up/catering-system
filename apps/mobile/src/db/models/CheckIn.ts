import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class CheckInModel extends Model {
  static table = 'check_ins';

  @field('user_id') userId!: string;
  @field('kind') kind!: 'in' | 'out';
  @field('lat') lat?: number;
  @field('lng') lng?: number;
  @field('accuracy') accuracy?: number;
  @date('at') at!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('is_dirty') isDirty!: boolean;
}
