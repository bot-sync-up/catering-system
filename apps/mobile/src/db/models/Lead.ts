import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class LeadModel extends Model {
  static table = 'leads';

  @field('name') name!: string;
  @field('phone') phone?: string;
  @field('source') source?: string;
  @field('status') status!: string;
  @field('owner_id') ownerId?: string;
  @date('updated_at') updatedAt!: Date;
  @field('is_dirty') isDirty!: boolean;
}
