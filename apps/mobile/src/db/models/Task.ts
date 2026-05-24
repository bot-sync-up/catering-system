import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, writer } from '@nozbe/watermelondb/decorators';

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';

export class TaskModel extends Model {
  static table = 'tasks';

  @field('title') title!: string;
  @field('description') description?: string;
  @field('status') status!: TaskStatus;
  @field('priority') priority!: number;
  @field('assignee_id') assigneeId?: string;
  @field('customer_id') customerId?: string;
  @date('due_at') dueAt?: Date;
  @date('completed_at') completedAt?: Date;
  @date('updated_at') updatedAt!: Date;
  @date('server_updated_at') serverUpdatedAt?: Date;
  @field('conflict_flag') conflictFlag?: string;
  @field('is_dirty') isDirty!: boolean;

  @writer async markDone() {
    await this.update((t) => {
      t.status = 'done';
      (t as any).completedAt = new Date();
      t.isDirty = true;
      (t as any).updatedAt = new Date();
    });
  }

  @writer async setStatus(next: TaskStatus) {
    await this.update((t) => {
      t.status = next;
      t.isDirty = true;
      (t as any).updatedAt = new Date();
    });
  }
}
