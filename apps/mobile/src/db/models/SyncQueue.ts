import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class SyncQueueModel extends Model {
  static table = 'sync_queue';

  @field('op') op!: 'create' | 'update' | 'delete';
  @field('table') table!: string;
  @field('record_id') recordId!: string;
  @field('payload') payload!: string;
  @field('attempts') attempts!: number;
  @field('last_error') lastError?: string;
  @date('created_at') createdAt!: Date;
}
