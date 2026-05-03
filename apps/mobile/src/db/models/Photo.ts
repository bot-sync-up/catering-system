import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class PhotoModel extends Model {
  static table = 'photos';

  @field('task_id') taskId?: string;
  @field('local_uri') localUri!: string;
  @field('remote_url') remoteUrl?: string;
  @field('ocr_text') ocrText?: string;
  @field('queued') queued!: boolean;
  @field('uploaded') uploaded!: boolean;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('is_dirty') isDirty!: boolean;
}
