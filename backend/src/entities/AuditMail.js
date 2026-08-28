'use strict';
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'AuditMail',
  tableName: 'audit_mail',
  columns: {
    ID: { type: 'int', primary: true, generated: true },
    recipientEmail: { type: 'varchar', length: 255 },
    subject: { type: 'varchar', length: 500 },
    htmlBody: { type: 'mediumtext' },
    category: { type: 'varchar', length: 100, default: 'system' },
    status: {
      type: 'enum',
      enum: ['pending', 'processing', 'sent', 'failed', 'skipped_unsubscribed'],
      default: 'pending',
    },
    relatedEntityType: { type: 'varchar', length: 100, nullable: true },
    relatedEntityID: { type: 'int', nullable: true },
    studentID: { type: 'int', nullable: true },
    attempts: { type: 'int', default: 0 },
    maxAttempts: { type: 'int', default: 3 },
    nextAttemptAt: { type: 'datetime', nullable: true },
    lockedAt: { type: 'datetime', nullable: true },
    sentAt: { type: 'datetime', nullable: true },
    providerMessageID: { type: 'varchar', length: 255, nullable: true },
    lastError: { type: 'text', nullable: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
  indices: [
    { name: 'IDX_audit_mail_status_next_attempt', columns: ['status', 'nextAttemptAt'] },
    { name: 'IDX_audit_mail_related_entity', columns: ['relatedEntityType', 'relatedEntityID'] },
    { name: 'IDX_audit_mail_student', columns: ['studentID'] },
  ],
});
