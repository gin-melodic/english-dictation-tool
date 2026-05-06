import type { Plugin } from 'vite';
import express from 'express';

export function apiPlugin(): Plugin {
  return {
    name: 'vite-plugin-local-api',
    configureServer(server) {
      const app = express();
      app.use(express.json({ limit: '20mb' }));

      // Use server.ssrLoadModule so Vite transpiles TypeScript at request time
      app.get('/api/wordbooks', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/wordbooks.ts');
        return mod.handleGet(req, res);
      });
      app.post('/api/wordbooks', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/wordbooks.ts');
        return mod.handlePost(req, res);
      });
      app.get('/api/wordbooks/:id', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/wordbooks/[id].ts');
        return mod.handleGetOne(req, res);
      });
      app.delete('/api/wordbooks/:id', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/wordbooks/[id].ts');
        return mod.handleDelete(req, res);
      });
      app.head('/api/tts-cache/:key', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/tts-cache/[key].ts');
        return mod.handleHead(req, res);
      });
      app.get('/api/tts-cache/:key', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/tts-cache/[key].ts');
        return mod.handleGet(req, res);
      });
      app.put('/api/tts-cache/:key', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/tts-cache/[key].ts');
        return mod.handlePut(req, res);
      });

      server.middlewares.use(app);
    },
  };
}
