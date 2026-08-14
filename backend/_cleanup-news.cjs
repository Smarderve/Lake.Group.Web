/* global console, process */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const SLUG = 'phase-5-test-article';
(async () => {
  const news = await prisma.news.findUnique({ where: { slug: SLUG } });
  if (!news) {
    console.log('not found');
    await prisma.$disconnect();
    return;
  }
  const id = news.id;
  await prisma.newsVersion.deleteMany({ where: { newsId: id } });
  await prisma.notification.deleteMany({ where: { entityType: 'news', entityId: id } });
  // polymorphic schedule/publish-schedule rows — check model names by trying both
  try {
    await prisma.schedule.deleteMany({ where: { entityType: 'news', entityId: id } });
  } catch {
    // Older schemas do not expose this delegate.
  }
  try {
    await prisma.publishSchedule.deleteMany({ where: { entityType: 'news', entityId: id } });
  } catch {
    // Older schemas do not expose this delegate.
  }
  await prisma.news.delete({ where: { id } });
  const left = await prisma.news.count();
  console.log('deleted', id, 'remaining news:', left);
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error.message);
  await prisma.$disconnect();
  process.exit(1);
});
