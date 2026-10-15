import { prisma } from '../../packages/db/prisma/db';
import { createWebhookApp } from './app.ts';

const app = createWebhookApp(prisma, process.env.ZAP_SECRET);
const port = Number(process.env.PORT ?? 3003);
const server = app.listen(port, () => console.log('Hooks server is running on localhost:' + port));

async function shutdown() {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await prisma.$disconnect();
}
process.once('SIGINT', () => { void shutdown().catch(() => { process.exitCode = 1; }); });
process.once('SIGTERM', () => { void shutdown().catch(() => { process.exitCode = 1; }); });
