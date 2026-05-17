import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class NoteModel extends Model {
  static table = 'notes';

  @field('author_id') authorId!: string;
  @field('parent_type') parentType?: string;
  @field('parent_id') parentId?: string;
  @field('body') body!: string;
  @date('updated_at') updatedAt!: Date;
  @field('is_dirty') isDirty!: boolean;
}
