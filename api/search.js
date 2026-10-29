const UA = 'RockNewsMy10Bands/1.0 (https://www.rocknews.co.uk/; contact@rocknews.co.uk)';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    if (q.length < 2) return res.status(400).json({ error: 'query too short' });

    let mbRes;
    for (let attempt = 0; attempt < 4; attempt++) {
      mbRes = await fetch(
        `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(q)}&fmt=json&limit=12`,
        { headers: { 'User-Agent': UA, Accept: 'application/json' } }
      );
      if (mbRes.status !== 503 && mbRes.status !== 429) break;
      await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
    }
    if (!mbRes.ok) {
      return res.status(mbRes.status === 503 || mbRes.status === 429 ? 503 : 502).json({
        error: `MusicBrainz ${mbRes.status}`,
      });
    }
    const data = await mbRes.json();
    const artists = (data.artists || []).filter(a => a.name && (a.score == null || a.score >= 70)).slice(0, 8);

    const results = await Promise.all(artists.map(async (artist) => ({
      id: artist.id,
      name: artist.name,
      type: artist.type || 'Artist',
      disambiguation: artist.disambiguation || '',
      image: await getArtistImage(artist.name, artist.disambiguation),
    })));
    return res.status(200).json({ results });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: (e && e.message) ? String(e.message).slice(0, 200) : 'search failed' });
  }
};

async function getArtistImage(name, disambiguation) {
  const candidates = [
    `${name} (band)`,
    name,
    disambiguation ? `${name} (${disambiguation})` : null,
  ].filter(Boolean);
  for (const title of candidates) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!r.ok) continue;
      const d = await r.json();
      if (d.type === 'disambiguation') continue;
      const img = (d.thumbnail && d.thumbnail.source) || (d.originalimage && d.originalimage.source);
      if (img) return img;
    } catch (_) {}
  }
  return null;
}
