import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { TaskModel } from './models/Task';
import { CheckInModel } from './models/CheckIn';
import { PhotoModel } from './models/Photo';
import { NoteModel } from './models/Note';
import { OrderModel } from './models/Order';
import { ShiftModel } from './models/Shift';
import { LeadModel } from './models/Lead';
import { SignatureModel } from './models/Signature';
import { UserModel } from './models/User';
import { SyncQueueModel } from './models/SyncQueue';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
  dbName: 'fieldops.db',
  onSetUpError: (error) => {
    // eslint-disable-next-line no-console
    console.error('DB setup failed', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    UserModel,
    TaskModel,
    CheckInModel,
    PhotoModel,
    NoteModel,
    OrderModel,
    ShiftModel,
    LeadModel,
    SignatureModel,
    SyncQueueModel,
  ],
});
