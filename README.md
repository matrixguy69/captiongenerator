# Pill Captions

A small web app that generates transparent PNG captions with per-line "pill"
background boxes — the Instagram/TikTok caption look — instead of the single
rectangle Premiere/Adobe draws behind a whole text block.

No build step. Plain HTML/CSS/JS.

## Run locally
Just open `index.html` in a browser, or serve the folder with any static server:

```bash
npx serve .
```

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. Go to vercel.com → **Add New Project** → import the repo.
3. Framework preset: **Other** (no build command, no output directory needed).
4. Deploy.

That's it — it's a static site, so Vercel will serve the files as-is.

## Using it
1. Type your caption text (press Enter for manual line breaks, or leave
   auto-wrap on).
2. Pick font, size, text color, pill color/opacity, corner radius (drag to
   100 for a full pill), padding, and gap between lines.
3. Set position on the frame (sliders or quick presets like "Lower third").
4. Set your resolution (presets for 1920×1080, 1080×1920, 1080×1080, or type
   custom width/height).
5. Optional: upload a reference frame from your footage just to line things
   up visually — it's shown in the editor only and is **never** included in
   the exported PNG.
6. Click **Download PNG**. The file is transparent everywhere except the
   pills and text, so it drops straight into Premiere as an overlay clip/PNG
   sequence layer.
