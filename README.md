# ghadinehme.github.io

Personal academic website of Ghadi Nehme (MIT). It is a plain static site (HTML, CSS, and a small amount of JS) with no build step, served by GitHub Pages.

## Structure

```
index.html                 home: intro, Featured walkthroughs, news, videos, contact
publications.html          all papers
projects.html              research, course and hardware projects
experience.html            experience, awards, education, teaching
404.html, sitemap.xml, robots.txt
assets/css/style.css       styles, including light and dark themes
assets/js/main.js          theme toggle, hover animations, scroll effects
assets/Ghadi_Nehme_CV.pdf  CV linked from the nav and hero
assets/img/pubs/           paper teaser images (plus the VideoCAD hover GIF)
assets/img/projects/       project images
assets/reports/            project reports and thesis PDFs
```

## Common edits

- **Add a news item:** copy an `<li>` in `#newsList` (index.html), newest first. Category tags: `cat-paper`, `cat-award`, `cat-press`, `cat-career`, `cat-teaching`.
- **Add a paper:** copy an `<article class="pub">` block in publications.html. Put an 800×500 thumbnail in `assets/img/pubs/` (figures on white get class `fig`, photos get `photo`).
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
