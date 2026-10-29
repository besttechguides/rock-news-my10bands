const { list } = require('@vercel/blob');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).end();
    }
    let posters = 0;
    let cursor;
    do {
      const page = await list({ prefix: 'shares/', cursor, limit: 1000 });
      posters += (page.blobs || []).filter(b => b.pathname.endsWith('.json')).length;
      cursor = page.cursor;
      if (!page.hasMore) break;
    } while (cursor);
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    return res.status(200).json({
      postersCreated: posters,
      note: 'Counts unique public share links saved (Create poster). Local drafts and regenerates of the same share are not extra counts.',
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: (e && e.message) ? String(e.message).slice(0, 200) : 'stats failed' });
  }
};
