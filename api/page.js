const { head } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'https://rock-news-my10bands.vercel.app';

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

module.exports = async (req, res) => {
  try {
    const id = String(req.query.id || '').trim();
    if (!/^[A-Za-z0-9]{4,20}$/.test(id)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end('<!doctype html><title>Not found</title><h1>Collection not found</h1><p><a href="/">Make your own</a></p>');
    }

    let bands = [];
    let image = `${SITE}/og.png`;
    let names = 'My 10 Bands';
    try {
      const meta = await head(`shares/${id}.json`);
      const r = await fetch(meta.url);
      if (r.ok) {
        const d = await r.json();
        bands = d.bands || [];
        names = bands.map(b => b.name).filter(Boolean).slice(0, 10).join(', ') || names;
        const firstImg = bands.find(b => b && b.image);
        if (firstImg && firstImg.image) image = firstImg.image;
      }
    } catch (_) {}

    const title = 'My 10 Bands — Rock News UK';
    const desc = (`The 10 bands that changed my life: ${names}`).slice(0, 200);
    const url = `${SITE}/p/${id}`;

    let html = fs.readFileSync(path.join(__dirname, '../public/collection.html'), 'utf8');
    const og = `
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Rock News UK" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(desc)}" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(desc)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<link rel="canonical" href="${escapeHtml(url)}" />
`;
    html = html.replace('<head>', '<head>' + og);
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(
      'const SHARE_MATCH = location.pathname.match(/^\\/p\\/([A-Za-z0-9_-]{4,20})\\/?$/);\nconst SHARE_ID = SHARE_MATCH ? SHARE_MATCH[1] : null;',
      `const SHARE_MATCH = [null, ${JSON.stringify(id)}];\nconst SHARE_ID = ${JSON.stringify(id)};`
    );

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.end(html);
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Error loading collection');
  }
};
