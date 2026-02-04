import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head>
        <title>TurboVets App</title>
        <style>
          body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          h1 { color: #333; }
          .rocket { font-size: 3rem; }
          .subtitle { color: #666; font-size: 1.2rem; }
        </style>
      </head>
      <body>
        <div class="rocket">🚀</div>
        <h1>TurboVets App is Live!</h1>
        <p class="subtitle">Deployment Successful.</p>
      </body>
    </html>
  `);
});

export default router;