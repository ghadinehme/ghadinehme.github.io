# ghadinehme.github.io

Personal academic website of Ghadi Nehme (MIT). It is a plain static site (HTML, CSS, and a small amount of JS) with no build step, served by GitHub Pages.

## Structure

```
index.html                 all page content (sections are marked with comments)
assets/css/style.css       styles, including light and dark themes
assets/js/main.js          theme toggle, publication filters, BibTeX, news toggle, scroll effects
assets/Ghadi_Nehme_CV.pdf  CV linked from the nav and hero
assets/img/pubs/           paper teaser images (plus the VideoCAD hover GIF)
assets/img/projects/       project images
assets/reports/            project reports and thesis PDFs
```

## Common edits

- **Add a news item:** copy an `<li>` in `#newsList`, newest first. Only the first 7 are shown until the visitor clicks "Show all".
- **Add a paper:** copy an `<article class="pub">` block. `data-tags` controls which filter buttons show it (`first`, `conference`, `preprint`). Put a 1200px-wide teaser in `assets/img/pubs/`.
  To get an animated preview on hover, add `data-hover="path/to.gif"` to the `<img>`.
- **Update the CV:** replace `assets/Ghadi_Nehme_CV.pdf` and keep the same filename.

## Preview locally

```
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

1. Create a public GitHub repo named exactly **`ghadinehme.github.io`**.
2. Push this folder to it:
   ```
   git remote add origin https://github.com/ghadinehme/ghadinehme.github.io.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**. Under "Build and deployment", set Source to "Deploy from a branch" and choose `main` / `/ (root)`.
4. The site goes live at https://ghadinehme.github.io/ within a minute or two.
   The existing project pages (`/videocad.github.io/`, `/cadfit.github.io/`, `/lamp.github.io/`) keep working.
