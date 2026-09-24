# Copilot instructions for this repository

This repository is a static corporate website for JM Stands. Treat it as a lightweight HTML/CSS/JS project with no build pipeline.

## Project context
- Site content is mostly authored in `index.html`, `privacidade.html`, and `links.html`.
- Business data is centralized in `js/config.js` and should be edited there instead of duplicating values.
- Styling is handled by `css/style.css`.
- Behavior is handled by `js/main.js`, `js/quote.js`, `js/i18n.js`, and `js/consent.js`.

## Guidance for edits
- Keep the website static and dependency-free unless the user explicitly asks for a framework.
- Maintain responsive, mobile-friendly behavior.
- Preserve real relative asset paths.
- Prefer small, targeted edits that match the current structure and naming conventions.
- Avoid leaving placeholders like `TROQUE`, fake contact information, or incomplete legal text in published pages.
- Do not hardcode contact data in multiple places when it belongs in `js/config.js`.

## Validation
- Verify visual and functional changes by opening the page locally in a browser.
- A simple local server is enough: `python -m http.server 8080`.
- Check the browser console for script errors when editing JS.

## Priority
When making changes, prioritize correctness, brand consistency, and minimal scope.
