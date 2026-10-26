# CHARM / ชาม Taskboard

This board tracks the implementation and launch readiness of the CHARM / ชาม
fortune ritual for Sala Thai. It complements the detailed UX/UI and graphic
design requirements:

- [Implementation taskboard](https://github.com/ppinkky/lucky-charm/issues/10)
- [UX/UI designer checklist](https://github.com/ppinkky/lucky-charm/issues/9)
- [Graphic designer checklist](https://github.com/ppinkky/lucky-charm/issues/8)

The repository is a static site with no automated task-board integration. Keep
this document aligned with the code and use the linked GitHub issues for
discussion, approvals, and external ownership.

## Status legend

| Status | Meaning |
| --- | --- |
| **Done** | Implemented in the repository and ready for verification |
| **Review** | Implemented or specified, but needs design, content, accessibility, restaurant, or production confirmation |
| **Ready** | Requirements/assets are available and the work can be started |
| **Backlog** | Identified work that is not yet ready or is outside the current implementation |

## Current snapshot

| Area | Status | Source of truth |
| --- | --- | --- |
| Public story page | **Done** | [index.html](../index.html), [styles.css](../styles.css) |
| Fortune ritual flow | **Done** | [app.html](../app.html), [app.js](../app.js), [app.css](../app.css) |
| Fortune content collection | **Done** | [fortune.json](../fortune.json) |
| Motion and tap interaction | **Done** | [app.js](../app.js) |
| Accessibility and failure states | **Review** | [app.html](../app.html), [app.js](../app.js) |
| Thai language experience | **Ready** | [docs/ux-ui-requirements.md](./ux-ui-requirements.md) |
| Share-image behavior | **Review** | [app.js](../app.js), [docs/ux-ui-requirements.md](./ux-ui-requirements.md) |
| Production launch | **Review** | [CNAME](../CNAME), launch checklist below |

## Completed implementation

### Product and content

- [x] Define CHARM as an interactive dining ritual connecting food, luck, and
      prosperity.
- [x] Establish the domain vocabulary and product boundaries in
      [CONTEXT.md](../CONTEXT.md).
- [x] Add twelve fortune records with number, title, overall reading, love,
      wealth, work/study, health, lucky dish/sign, and intention metadata.
- [x] Keep the private question out of the UI, network requests, storage, and
      share output.
- [x] Add the public story page with the CHARM/Sala Thai narrative, inspiration,
      food illustrations, shake demonstration, and maker credits.

### Ritual flow

- [x] Add title and collaboration splash screens.
- [x] Add the welcome screen and entry action.
- [x] Add intention selection for love, health, wealth, work, and food.
- [x] Load and validate `fortune.json` when the ritual begins.
- [x] Filter by intention when matching records exist, then choose randomly.
- [x] Add the focus-your-mind step before the draw.
- [x] Add revealing, shake, fortune-number, and result states.
- [x] Lock the reveal while the result transition is in progress.
- [x] Reset the selected fortune, intention, animation state, and prepared share
      image with “Try again.”

### Interaction and resilience

- [x] Support device shaking through `devicemotion` where available.
- [x] Request iOS motion permission from a user gesture.
- [x] Keep tapping the bowl available as the universal fallback.
- [x] Support desktop click interaction and a local keyboard shake simulator.
- [x] Add haptic feedback where the browser/device supports it.
- [x] Respect `prefers-reduced-motion` by shortening or skipping choreography.
- [x] Keep the app sized to the live mobile viewport, including browser chrome
      and orientation changes.
- [x] Add a recoverable error screen for failed or empty fortune data.

### Accessibility

- [x] Use semantic buttons for primary actions and the bowl interaction.
- [x] Move focus to each newly shown screen.
- [x] Support Enter/Space for splash-screen advancement.
- [x] Provide a polite live region for ritual, result, sharing, and error
      announcements.
- [x] Provide text alternatives for meaningful logos and hide decorative art
      from assistive technology where appropriate.

### Sharing

- [x] Render and cache a PNG representation of the current fortune slip.
- [x] Use the Web Share API with a file where supported.
- [x] Provide download/open-image fallbacks for browsers without file sharing.
- [x] Provide an iOS long-press-to-save path.
- [x] Keep private questions and personal data out of the generated image.

## Open work

### Review before launch

- [ ] Test the complete flow on current iOS Safari, Android Chrome, desktop
      Chrome, Safari, and Firefox.
- [ ] Verify the actual production URL, not only localhost.
- [ ] Test at 320px, 390px, 430px, 768px, and 1440px widths.
- [ ] Verify safe-area padding, touch-target size, focus rings, overflow, and
      one-handed mobile reach.
- [ ] Test motion permission granted, denied, unavailable, delayed, and
      interrupted.
- [ ] Verify the bowl cannot be triggered twice during the reveal.
- [ ] Verify reduced motion still communicates the draw and result.
- [ ] Test keyboard navigation and screen-reader reading order.
- [ ] Confirm all announcements are accurate, timely, and non-duplicative.
- [ ] Test missing assets and failed `fortune.json` loading.
- [ ] Verify the longest fortune records remain readable.
- [ ] Test sharing and saving on supported and unsupported browsers.
- [ ] Confirm the generated image composition, dimensions, logo treatment, and
      filename with the restaurant/design team.
- [ ] Check the experience in realistic restaurant lighting and network
      conditions.

### Thai language support

The current implementation is English-first and the current
[fortune.json](../fortune.json) records contain English readings. The product
requirements call for Thai as a second view, so this remains ready work:

- [ ] Supply approved Thai translations for every fortune field.
- [ ] Add the opening-screen `ไทย` control.
- [ ] Add a result language control and/or swipe interaction.
- [ ] Preserve the selected fortune when switching language.
- [ ] Make retry preserve the selected language.
- [ ] Render the currently visible language in the share image.
- [ ] Test Thai glyph support, wrapping, line height, and long entries.

### Launch wiring

- [ ] Confirm the final production host and HTTPS configuration.
- [ ] Confirm QR code opens the intended entry point.
- [ ] Confirm NFC tag opens the intended entry point.
- [ ] Test the QR and NFC paths on iOS and Android.
- [ ] Confirm the custom domain represented by [CNAME](../CNAME).
- [ ] Record the production URL and approved launch build in issue #10.
- [ ] Obtain restaurant, design, accessibility, and production sign-off.

## Backlog

- [ ] Add automated browser smoke tests for the critical ritual path.
- [ ] Add a repeatable visual check for the 1080 x 1920 share composition.
- [ ] Add an explicit asset inventory with dimensions, viewBox, crop-safe area,
      and state mapping.
- [ ] Decide whether sound is part of the final experience; if it is, define
      muted, enabled, permission, and reduced-motion behavior first.
- [ ] Revisit analytics only as a separate product decision. Do not add
      tracking implicitly: analytics are outside the current product boundary.

## Definition of done

Issue #10 can be closed only when:

1. The implemented flow passes the review checklist above on supported mobile
   and desktop browsers.
2. Approved content and assets are present, including Thai if that requirement
   is included in the launch scope.
3. QR and NFC entry points open the correct production URL.
4. Sharing, saving, accessibility, reduced motion, motion denial, tap fallback,
   and error recovery have been verified.
5. Sala Thai, design, accessibility, and production stakeholders approve the
   deployed experience.
