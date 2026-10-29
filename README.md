# Rock News UK — My 10 Bands

Static front end + one Vercel serverless function. Intended domain: **bands.rocknews.co.uk**.

## How it works
- `public/index.html`: the builder. Search MusicBrainz, get photos from Wikipedia, save a draft in localStorage, use the Rock News theme (black/red, new "Blood" background). The poster footer reads **rocknews.co.uk · Rock News UK · My 10 Bands**. Download PNG, native share, and X intent all still work.
- **Create poster** sends a POST to `/api/share` with `{theme, bands:[{id,name,image}]}`. The typed name is never sent. The server checks the input (exactly 10 bands, image URLs limited to wikimedia/wikipedia https). It saves `shares/{id}.json` to Vercel Blob and returns a 7-character id. The poster modal shows the URL `/p/{id}` and a **Copy link** button. The link is also added to the share text.
- `/p/{id}` is rewritten to `public/p.html` (the same app with `<meta robots noindex>` plus an `X-Robots-Tag` header). It runs GET `/api/share?id=` and shows the 10 bands read-only, with Regenerate poster / Download / Share and "Make your own".

## Env vars
- `BLOB_READ_WRITE_TOKEN`: set automatically when you connect a Vercel Blob store (public access) to the project. Nothing else is needed.

## Deploy
1. Vercel → Rock News team → Add New Project → upload/import this folder (or `npx vercel --scope rock-news` from this dir). Framework: Other. Output directory: `public`. No build command.
2. Storage → Create → Blob (public) → connect it to the project (all environments). Redeploy.
3. Test: fill 10 slots → Create poster → Copy link → open `/p/xxxx`.

## Custom domain bands.rocknews.co.uk
1. Project → Settings → Domains → add `bands.rocknews.co.uk`.
2. At the rocknews.co.uk DNS host add: `CNAME  bands  cname.vercel-dns.com` (or the project-specific value Vercel shows). If Vercel asks for it, also add the `_vercel` TXT verification record.
3. Wait for Vercel to show "Valid Configuration". SSL is issued automatically. WordPress on www is not affected.
