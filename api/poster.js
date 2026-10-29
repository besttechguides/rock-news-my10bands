const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).end();
    }
    const id = String(req.query.id || '').trim();
    if (!/^[A-Za-z0-9]{4,20}$/.test(id)) return res.status(400).json({ error: 'bad id' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const b64 = String(body.image || '').replace(/^data:image\/jpeg;base64,/, '');
    if (!b64 || b64.length < 500) return res.status(400).json({ error: 'missing image' });
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > 3_500_000) return res.status(400).json({ error: 'image too large' });

    const uploaded = await put(`shares/${id}.jpg`, buf, {
      access: 'public',
      contentType: 'image/jpeg',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return res.status(201).json({ url: uploaded.url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: (e && e.message) ? String(e.message).slice(0, 200) : 'upload failed' });
  }
};
