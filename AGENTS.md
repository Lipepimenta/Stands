# AGENTS.md

## Project overview
This repository contains a static corporate website for JM Stands. It is built with plain HTML, CSS, and JavaScript only. There is no bundler, no build step, and no framework.

## Core files
- `index.html` — home page, sections, FAQ, stats, contact details
- `404.html` — not-found page
- `privacidade.html` — privacy policy / LGPD page
- `links.html` — quick links page
- `css/style.css` — main styling
- `js/config.js` — editable business data: WhatsApp, addresses, social links, projects, clients, analytics IDs
- `js/main.js` — portfolio behavior, gallery, section logic
- `js/quote.js` — quote request wizard and form handling
- `js/i18n.js` and `js/consent.js` — language and cookie consent logic
- `assets/` — images, icons, and static media

## Working rules
- Keep changes lightweight and static-site friendly.
- Prefer relative paths for images and links.
- Do not introduce frameworks, package managers, or build tooling unless explicitly requested.
- Update copy and placeholders only with real business data; avoid leaving `TROQUE` or fake values in published content.
- Preserve the existing structure and semantics of the HTML unless a feature clearly requires a change.
- If adding a project, client, or social media entry, update `js/config.js` rather than hardcoding values in multiple files.
- Maintain accessibility and mobile-first behavior when editing the layout.

## Content and data conventions
- WhatsApp and contact details live in `js/config.js`.
- Project photos belong under `assets/img/` and should match the paths defined in config data.
- Logos and client references should be added to `clients` in `js/config.js` only.
- Google Analytics / Meta Pixel IDs belong in the analytics config, and consent logic must remain respected.
- Before publishing, verify that real domain, legal text, and contact information are in place.

## Validation
To validate the site locally:

1. Open `index.html` directly in a browser, or
2. Run: `python -m http.server 8080` in the repository root and visit http://localhost:8080

Check for broken image paths, JavaScript console errors, and layout regressions after edits.

## Preferred implementation style
- Prefer small, targeted changes over large rewrites.
- Keep selectors and script behavior compatible with the existing site.
- If updating content for SEO or legal pages, maintain consistent branding and the existing page tone.
- Default to existing patterns and styling rather than introducing new conventions.
