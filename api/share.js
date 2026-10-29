const { put, head } = require('@vercel/blob');
const crypto = require('crypto');
const THEMES = ['blood','wood','paper','dark','neon','cream'];
const ALPH = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newId = () => Array.from(crypto.randomBytes(7), b => ALPH[b % ALPH.length]).join('');
const cleanImg = u => { try { const x = new URL(u); return x.protocol === 'https:' && /(^|\.)wikimedia\.org$|(^|\.)wikipedia\.org$/.test(x.hostname) ? x.href : null; } catch { return null; } };

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      if (!Array.isArray(body.bands) || body.bands.length !== 10) return res.status(400).json({ error: 'need 10 bands' });
      const bands = body.bands.map(b => ({
        id: String(b && b.id || '').slice(0, 64),
        name: String(b && b.name || '').slice(0, 120),
        image: cleanImg(b && b.image),
      }));
      if (bands.some(b => !b.name)) return res.status(400).json({ error: 'invalid band' });
      const theme = THEMES.includes(body.theme) ? body.theme : 'blood';
      const id = newId();
      await put(`shares/${id}.json`, JSON.stringify({ id, bands, theme, createdAt: new Date().toISOString() }),
        { access: 'public', contentType: 'application/json', addRandomSuffix: false });
      return res.status(201).json({ id, url: `/p/${id}` });
    }
    if (req.method === 'GET') {
      const id = String(req.query.id || '');
      if (!/^[A-Za-z0-9]{4,20}$/.test(id)) return res.status(400).json({ error: 'bad id' });
      let meta;
      try { meta = await head(`shares/${id}.json`); } catch { return res.status(404).json({ error: 'not found' }); }
      const r = await fetch(meta.url);
      if (!r.ok) return res.status(404).json({ error: 'not found' });
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      res.setHeader('X-Robots-Tag', 'noindex');
      return res.status(200).json(await r.json());
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    const msg = (e && e.message) ? String(e.message).slice(0, 300) : 'server error';
    const missing = !process.env.BLOB_READ_WRITE_TOKEN;
    return res.status(500).json({ error: missing ? 'BLOB_READ_WRITE_TOKEN missing — connect a Blob store to this project and redeploy' : msg });
  }
};
