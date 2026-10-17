import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const directory = path.dirname(fileURLToPath(import.meta.url));
async function startServer() {
  const app = express();
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', hosting: 'local', receiptOcrConfigured: false }));
  app.all('/api/state', (_req, res) => res.status(503).json({ error: 'Penyelarasan D1 memerlukan laman Cloudflare Pages yang telah dilog masuk. Data setempat dikekalkan.' }));
  app.all('/api/scan-receipt', (_req, res) => res.status(503).json({ error: 'OCR sebenar tersedia pada laman Cloudflare Pages. Pelayan pembangunan tempatan tidak mempunyai binding Workers AI; tiada data gantian dihasilkan.' }));
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(directory, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve(directory, 'dist', 'index.html')));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('KewanganKu local server ready'));
}
void startServer();
