import 'dotenv/config';
import { createDb } from '../src/db.js';

const db = createDb(process.env.DATABASE_URL);
try {
  const tables = await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log('TABLES:', tables.map(t => t.table_name).join(', '));
  const metric = await db.metric.findUnique({ where: { key: 'employees' } });
  console.log('EMPLOYEES_METRIC:', metric ? JSON.stringify({ value: metric.value, status: metric.status, verificationStatus: metric.verificationStatus, updatedAt: metric.updatedAt }) : 'NONE');
  const users = await db.user.count();
  console.log('USERS:', users);
  const audits = await db.auditLog.count();
  console.log('AUDIT_ROWS:', audits);
  const versionCount = await db.metricVersion.count();
  console.log('METRIC_VERSIONS:', versionCount);
  const pubEvts = await db.publicationEvent.count();
  console.log('PUBLICATION_EVENTS:', pubEvts);
} finally {
  await db.$disconnect();
}
