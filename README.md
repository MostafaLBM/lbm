# LBM research recruitment website

A static GitHub Pages website: index.html (menu and demos), how.html,
research.html, gallery.html, and assets/. No build or installation is required.

## Publish with GitHub Pages

1. Create a public repository, for example `lbm`.
2. On the repository's Code page, select **Add file → Upload files**.
3. Upload the contents of this folder, keeping `index.html` at the repository root
   and preserving the complete `assets/` directory. Do not upload just the ZIP.
4. Commit to `main`.
5. Open **Settings → Pages**. Select **Deploy from a branch**, branch `main`,
   folder `/(root)`, then Save.
6. Open the site URL shown in Pages. For the account used by the existing demos,
   a repository named `lbm` would normally be at https://mostafalbm.github.io/lbm/.

GitHub instructions:
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Editing

Edit the HTML files directly. Add new gallery articles in gallery.html and place
their images and videos in assets/media/. Use relative paths so the site works
under any repository name. Keep videos on demand (`preload="none"` and controls).
The browser demos stay at their existing hosted addresses.

Fonts and LaTeX rendering use Google Fonts and MathJax CDN resources.
The diagrams, navigation and locally hosted media work without a backend.

## Remaining content

Add the supervisor name, affiliation/group and contact email before using this
as the final recruitment destination. No invented contact information is included.
Confirm the desired credits for the existing simulation images and clips.

Only website files are included: solver code, raw simulation data, internal source
paths and exploratory media have been excluded.
