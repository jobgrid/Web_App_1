# Web_App_1 (jobgrid.ai)

## Cursor Cloud specific instructions

This repo is a **static HTML/CSS site** (a job-board "Under Construction" landing page). There is no backend, no JavaScript bundler, and no framework.

- Entry point is `index.html`, styled by `styles.css`. There is no build step that produces real output — `npm run build` is a placeholder `echo` and `npm test` intentionally exits 1 (no tests exist). No linter is configured.
- To run it in development, serve the repo root over HTTP (the files are plain static assets), e.g. `python3 -m http.server 8000` and open `http://localhost:8000/index.html`. Opening the file over `http://` matters because the page links stylesheets/relative paths.
- The nav links (`about.html`, `contact.html`) and the `More Details` / `Apply Now` buttons are static only — there are no target pages or JS handlers yet, so they intentionally do nothing.
- Deployment is via `.github/workflows/deploy.yml` (GitHub Pages, `peaceiris/actions-gh-pages`). Note the workflow publishes `./build`, which the placeholder build does not generate — deployment config is out of scope for local dev.
