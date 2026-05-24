import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class SignatureModel extends Model {
  static table = 'signatures';

  @field('parent_type') parentType!: string;
  @field('parent_id') parentId!: string;
  @field('data_url') dataUrl!: string;
  @date('created_at') createdAt!: Date;
  @field('is_dirty') isDirty!: boolean;
}
