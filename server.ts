import express from 'express';
import path from 'path';
import fs from 'fs';
import { app as apiApp } from './api/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Mount the clean, standalone API routing from the sub-app
app.use(apiApp);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development Mode: Use Vite Middleware dynamically
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server connected successfully.');
  } else {
    // Production Mode: Serve built static HTML and frontend assets
    let distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      distPath = process.cwd();
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`Serving compiled static production files from: ${distPath}`);
  }

  const HOST = process.env.IP || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Serveur démarré avec succès sur http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Échec du démarrage de l'application:", err);
});
