import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'role', type: 'string' },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'branch_id', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // pending|in_progress|done|cancelled
        { name: 'priority', type: 'number' },
        { name: 'assignee_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'customer_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'due_at', type: 'number', isOptional: true },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
        { name: 'conflict_flag', type: 'string', isOptional: true },
        { name: 'is_dirty', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'check_ins',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'kind', type: 'string' }, // in|out
        { name: 'lat', type: 'number', isOptional: true },
        { name: 'lng', type: 'number', isOptional: true },
        { name: 'accuracy', type: 'number', isOptional: true },
        { name: 'at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number' },
        { name: 'is_dirty', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'photos',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'local_uri', type: 'string' },
        { name: 'remote_url', type: 'string', isOptional: true },
        { name: 'ocr_text', type: 'string', isOptional: true },
        { name: 'queued', type: 'boolean' },
        { name: 'uploaded', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'is_dirty', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'notes',
      columns: [
        { name: 'author_id', type: 'string', isIndexed: true },
        { name: 'parent_type', type: 'string', isOptional: true },
        { name: 'parent_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'body', type: 'string' },
        { name: 'updated_at', type: 'number' },
        { name: 'is_dirty', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'orders',
      columns: [
        { name: 'customer_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' },
        { name: 'total', type: 'number' },
        { name: 'paid_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
        { name: 'is_dirty', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'shifts',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'start_at', type: 'number' },
        { name: 'end_at', type: 'number', isOptional: true },
        { name: 'role', type: 'string' },
        { name: 'updated_at', type: 'number' },
        { name: 'is_dirty', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'leads',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'source', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'owner_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'updated_at', type: 'number' },
        { name: 'is_dirty', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'signatures',
      columns: [
        { name: 'parent_type', type: 'string' },
        { name: 'parent_id', type: 'string', isIndexed: true },
        { name: 'data_url', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'is_dirty', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'op', type: 'string' }, // create|update|delete
        { name: 'table', type: 'string' },
        { name: 'record_id', type: 'string', isIndexed: true },
        { name: 'payload', type: 'string' },
        { name: 'attempts', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
