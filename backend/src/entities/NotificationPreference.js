'use strict';
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'NotificationPreference',
  tableName: 'notification_preferences',
  columns: {
    ID: { type: 'int', primary: true, generated: true },
    emailHash: { type: 'varchar', length: 64 },
    category: { type: 'varchar', length: 100 },
    isUnsubscribed: { type: 'boolean', default: false },
    unsubscribedAt: { type: 'datetime', nullable: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
  indices: [
    { name: 'UQ_notification_preferences_email_category', columns: ['emailHash', 'category'], unique: true },
  ],
});
