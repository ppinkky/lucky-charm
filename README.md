# CHARM / ชาม — Food, Luck, Prosperity

> Every great meal starts with a little luck.

CHARM is a small interactive dining ritual made for Sala Thai in New York. A
guest holds a private question, chooses what they are hoping for, shakes or
taps a digital fortune bowl, and receives one of twelve food-inspired
fortunes.

It is a playful moment around the table, not a prediction service. Nothing is
typed, the private question is never stored, and the experience makes no claim
to professional or guaranteed advice.

[![The CHARM fortune bowl interaction](asset/card%20shaking-wireframe-poster.png)](app.html)

* * *

## The idea

**ชาม** (*chaam*) means “bowl” in Thai. In English, a **charm** can be an
object associated with luck. CHARM brings those two meanings together through a
contemporary dining ritual about food, luck, and prosperity.

The experience takes inspiration from **เซียมซี** (*siam si*), a Thai temple
fortune-telling practice in which a container of numbered sticks is shaken
until one falls out. That number corresponds to a fortune slip.

Here, the sticks become a digital interaction, the fortune slip becomes
something that can live on a phone, and the food on the table becomes part of
the reading itself.

The product boundaries and shared vocabulary live in
[CONTEXT.md](./CONTEXT.md).

## The flow

```text
Splash ─▶ Welcome ─▶ Intention ─▶ Focus ─▶ Reveal ─▶ Shake/Tap ─▶ Fortune
                                                                  │
                                                                  └─▶ Share
```

1. **Splash**: establish the CHARM and Sala Thai collaboration.
2. **Welcome**: invite the guest to reveal a fortune.
3. **Intention**: choose Love, Health, Wealth, Work, or Good Food.
4. **Focus**: hold a question privately and get ready.
5. **Reveal**: load the fortune collection and prepare the bowl.
6. **Shake/Tap**: shake the phone or tap the bowl to build energy and open it.
7. **Fortune**: pause on the number, then reveal the full fortune slip.
8. **Share**: prepare a portrait PNG and share or save it where supported.

The story page at [index.html](./index.html) explains the idea. The focused
ritual at [app.html](./app.html) is the surface opened from the story page,
QR code, or NFC tag.

## Why it was built this way

The central question was: **How can a restaurant guest experience a small
moment of luck with the people around them?**

That framing set most of the design decisions:

* **A ritual, not a form.** The guest thinks of a question but never types it.
  The experience stays private, fast, and easy to use at a table.
* **A bowl, not a generic fortune screen.** Shaking gives the draw a physical
  action and makes the digital result feel connected to Thai food culture.
* **One action at a time.** Each screen has a clear next step so the experience
  works for a guest who is standing, seated, distracted, or using one hand.
* **Tap is always available.** Motion permission, sensors, and restaurant space
  are unreliable. The bowl is also a button, and desktop click interaction is
  complete rather than a degraded afterthought.
* **Food belongs in the fortune.** Every record can point to a lucky dish, so
  the result returns the guest to the table instead of ending in an abstract
  prediction.
* **The result is shareable, not extractive.** A guest can share the fortune
  and restaurant identity, but the private question and personal data never
  enter the image.

The detailed UX/UI and visual requirements are in
[docs/ux-ui-requirements.md](./docs/ux-ui-requirements.md) and
[docs/graphic-designer-requirements.md](./docs/graphic-designer-requirements.md).

## The fortune collection

[fortune.json](./fortune.json) contains twelve prepared records. Each record
has:

* a number, slug, and fortune title;
* an overall prediction;
* Love, Wealth, Work/Study, and Health sections;
* an optional lucky dish and dish note;
* intention tags used to shape the draw;
* an optional food illustration.

At runtime, [app.js](./app.js):

1. fetches and validates the collection;
2. filters it by the selected intention when matching records exist;
3. chooses one record randomly from the resulting pool;
4. renders the number, fortune slip, categories, and lucky dish;
5. keeps no history, identity, or previous-attempt state.

The current collection and result UI are English-first. The product requirements
reserve a Thai view and language controls, but approved Thai translations and
the runtime language controls are still open work on the
[taskboard](./docs/taskboard.md).

## The build

### A static site on purpose

The app uses plain HTML, CSS, JavaScript, JSON, and supplied assets. There is
no application server, database, router, framework, or package manager.

That keeps the experience easy to host and easy to open from a restaurant QR
code. The only runtime data request is the local
[fortune.json](./fortune.json) collection.

| | |
| --- | --- |
| Markup | HTML5 |
| Styling | CSS with responsive layout and design tokens |
| Behavior | Vanilla JavaScript |
| Content | JSON fortune collection |
| Motion | CSS animation, `devicemotion`, and optional haptics |
| Sharing | Canvas/PNG generation and Web Share API |
| External services | Lenis and DM Mono CDN assets on the story page |
| Hosting | Static hosting with [CNAME](./CNAME) |

### Screen state instead of a framework

Every ritual screen is declared in [app.html](./app.html). The controller
shows one screen at a time and moves focus to it:

```text
opening1 → opening2 → opening → intention → focus
                                      ↓
                    error ← revealing → shake → number → result
                      ↑                                      │
                      └──────────── try again ───────────────┘
```

This keeps the state model visible. There is no hidden router or component
runtime to debug when a guest moves from one ritual step to the next.

### Shake, permission, and fallback

On supported phones, the app requests motion permission from the “I'm ready”
tap, which satisfies iOS's user-gesture requirement. While the shake screen is
active, acceleration deltas accumulate temporary shake energy. At the
threshold, the bowl charges, cracks, shakes, opens, and transitions to the
fortune number.

The interaction still works when:

* motion permission is denied;
* the device has no motion sensor;
* the browser does not expose `devicemotion`;
* the guest is on desktop;
* shaking is inconvenient in the restaurant.

For local testing, press `s` or Space on the shake screen to simulate motion.

### Motion and accessibility

Reduced motion is respected. With `prefers-reduced-motion: reduce`, splash
timings are shortened and the bowl choreography collapses into a direct result
while preserving the ritual's meaning.

The app also:

* uses semantic buttons for actions and the bowl;
* supports keyboard activation;
* moves focus to newly shown screens;
* announces state changes through an `aria-live` region;
* provides meaningful alt text and hides decorative art where appropriate;
* exposes recoverable loading and error states;
* keeps the tap path available without motion permission.

Important announcements include “The bowl is shaking” and “Your fortune is
ready.”

### Sharing the fortune

The share image starts rendering on the fortune-number screen so it is usually
ready by the time the guest taps Share. The preferred path is a PNG file passed
to the Web Share API. Browsers without file sharing receive a download or
open-image fallback, including the iOS long-press-to-save path.

The generated filename is `charm-fortune-XX.png`. The current renderer captures
the visible fortune slip and CHARM/Sala Thai identity only. It never includes
the private question or personal data.

## Project map

| Path | Role |
| --- | --- |
| [index.html](./index.html) | Public story and landing page |
| [styles.css](./styles.css) | Landing-page layout, palette, and motion |
| [app.html](./app.html) | Ritual screen markup |
| [app.js](./app.js) | State, data, motion, accessibility, and sharing |
| [app.css](./app.css) | Ritual layout and animation states |
| [fortune.json](./fortune.json) | Twelve fortune records |
| [asset/](./asset/) | Logos, bowl artwork, food art, photos, and demos |
| [CONTEXT.md](./CONTEXT.md) | Domain vocabulary and product boundaries |
| [docs/taskboard.md](./docs/taskboard.md) | Implementation and launch board |

## Run it locally

Because the ritual fetches `fortune.json`, use a local HTTP server rather than
opening the HTML file directly with `file://`.

```bash
python3 -m http.server 8000
```

Open:

* <http://localhost:8000/> for the story page;
* <http://localhost:8000/app.html> for the ritual.

No dependency installation is required.

## Before launch

The current implementation is ready for browser, content, and production
review. The important checks are tracked in
[docs/taskboard.md](./docs/taskboard.md), including:

* iOS Safari, Android Chrome, desktop Chrome, Safari, and Firefox;
* 320px, 390px, 430px, 768px, and 1440px layouts;
* motion permission granted, denied, unavailable, and interrupted;
* tap fallback, reduced motion, keyboard navigation, and screen readers;
* failed data loading, missing assets, retry, and duplicate reveal attempts;
* sharing and saving on supported and unsupported browsers;
* production URL, QR code, NFC tag, and restaurant lighting conditions.

## Credits

Created by **Pinky Arunwattanamongkol** and **Fai Chittayasodhara** with
**Tom Yum Lab**, in collaboration with **Sala Thai**.

Project-specific logos, illustrations, photographs, fortune writing, and
restaurant materials should not be reused or redistributed without permission.
