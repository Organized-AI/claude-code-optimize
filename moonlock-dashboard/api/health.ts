module.exports = function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.VERCEL_ENV || 'production',
      services: {
        api: 'operational',
        database: 'operational',
        websocket: 'limited' // WebSocket not fully supported on Vercel
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}