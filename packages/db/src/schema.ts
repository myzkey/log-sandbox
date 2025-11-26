import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const importedFiles = sqliteTable('imported_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filePath: text('file_path').notNull().unique(),
  fileSize: integer('file_size').notNull(),
  lineCount: integer('line_count').notNull(),
  importedAt: text('imported_at').notNull().default('CURRENT_TIMESTAMP'),
})

export const awsProfiles = sqliteTable('aws_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
})

export const albLogs = sqliteTable('alb_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Basic info
  awsProfile: text('aws_profile').notNull().default('default'),
  type: text('type').notNull(),
  timestamp: text('timestamp').notNull(),
  elbName: text('elb_name').notNull(),

  // Client & Target
  clientIp: text('client_ip').notNull(),
  clientPort: text('client_port').notNull(),
  targetIp: text('target_ip'),
  targetPort: text('target_port'),

  // Timing (in seconds)
  requestProcessingTime: real('request_processing_time').notNull(),
  targetProcessingTime: real('target_processing_time').notNull(),
  responseProcessingTime: real('response_processing_time').notNull(),
  totalTime: real('total_time').notNull(),

  // Status codes
  elbStatusCode: text('elb_status_code').notNull(),
  targetStatusCode: text('target_status_code').notNull(),

  // Flags
  isTimeout: integer('is_timeout', { mode: 'boolean' }).notNull().default(false),
  isRejected: integer('is_rejected', { mode: 'boolean' }).notNull().default(false),

  // Bytes
  receivedBytes: integer('received_bytes').notNull(),
  sentBytes: integer('sent_bytes').notNull(),

  // Request info
  requestMethod: text('request_method').notNull(),
  requestUrl: text('request_url').notNull(),
  requestPath: text('request_path').notNull(),
  requestProtocol: text('request_protocol').notNull(),

  // Additional info
  userAgent: text('user_agent'),
  sslCipher: text('ssl_cipher'),
  sslProtocol: text('ssl_protocol'),
  targetGroupArn: text('target_group_arn'),
  traceId: text('trace_id').unique(),
  domainName: text('domain_name'),

  // Raw data for debugging
  rawLine: text('raw_line').notNull(),
})

export type ImportedFile = typeof importedFiles.$inferSelect
export type NewImportedFile = typeof importedFiles.$inferInsert

export type AWSProfile = typeof awsProfiles.$inferSelect
export type NewAWSProfile = typeof awsProfiles.$inferInsert

export type ALBLog = typeof albLogs.$inferSelect
export type NewALBLog = typeof albLogs.$inferInsert
