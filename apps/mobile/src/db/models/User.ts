import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class UserModel extends Model {
  static table = 'users';

  @field('name') name!: string;
  @field('role') role!: string;
  @field('phone') phone?: string;
  @field('email') email?: string;
  @field('branch_id') branchId?: string;
  @date('updated_at') updatedAt!: Date;
  @date('server_updated_at') serverUpdatedAt?: Date;
}
