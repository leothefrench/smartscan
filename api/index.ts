export default async function handler(req: any, res: any) {
  try {
    const { app } = await import('./server');
    return app(req, res);
  } catch (error: any) {
    console.error('[Vercel API Handler Error]:', error);
    res.status(500).json({
      success: false,
      error: `Échec d'initialisation du serveur sur Vercel : ${
        error?.message || String(error)
      }`,
      details: error?.message || String(error),
      stack: error?.stack || null,
    });
  }
}
