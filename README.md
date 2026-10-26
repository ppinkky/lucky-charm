# CHARM / ชาม

**Food · Luck · Prosperity**

CHARM is an interactive dining ritual made for Sala Thai in New York. It brings
Thai food, fortune telling, illustration, technology, and play to the same
table. A visitor thinks of a private question, chooses what they are hoping
for, shakes or taps a digital fortune bowl, and receives one of twelve
food-inspired fortunes.

The experience is intentionally light and reflective. It is not a prediction
service, does not ask visitors to type their question, and does not collect
identity, questions, fortune history, or analytics.

## Experience

There are two connected surfaces:

1. **The story page** ([index.html](./index.html)) explains the idea, introduces
   the connection between *ชาม* (bowl) and *charm*, and credits the makers.
2. **The ritual** ([app.html](./app.html)) is the focused, phone-sized
   interaction reached by the “Try your luck!” call to action, a QR code, or an
   NFC tag.

The intended ritual is:

```text
title splash
  → collaboration splash
  → welcome
  → choose an intention
  → focus your mind
  → revealing
  → shake or tap the bowl
  → fortune number
  → fortune slip
```

The primary language is English. The content model and result markup reserve
space for a Thai view, but the current `fortune.json` collection is English
content; Thai translation and language controls remain product requirements
rather than completed runtime behavior.

## Why it was built this way

### Start with a human ritual, not a feature list

The central product question was: **How can a restaurant guest experience a
small moment of luck with the people around them?**

That led to a deliberately short interaction:

- The visitor holds the question privately instead of filling out a form.
- The bowl makes the familiar act of drawing a fortune feel physical.
- The result is connected to food, so the digital experience still belongs at
  the dining table.
- The result can be shared, but the private question never leaves the visitor's
  mind or device.

The domain decisions are recorded in [CONTEXT.md](./CONTEXT.md). It defines the
visitor, private question, bowl, fortune record, fortune slip, attempt, and
share image so that product, design, and implementation use the same language.

### Design for a restaurant environment

The app needs to work when a guest is standing, seated, distracted, or using a
phone with one hand. The design therefore favors:

- one clear action per screen;
- large touch targets and a full-screen ritual frame;
- a tap fallback when motion sensors are unavailable or permission is denied;
- desktop click interaction as a complete fallback;
- short, readable result sections instead of forcing English and Thai together;
- warm, tactile colors and bowl/food imagery rather than generic fantasy
  fortune-telling visuals.

The product and visual constraints are captured in
[docs/ux-ui-requirements.md](./docs/ux-ui-requirements.md) and
[docs/graphic-designer-requirements.md](./docs/graphic-designer-requirements.md).

### Build the smallest dependable technical shape

This is a static site: HTML, CSS, JavaScript, JSON, and supplied image assets.
There is no application server, database, build pipeline, or package manager.
That is intentional. A guest should be able to open the experience from a
hosted static URL without an account or backend request beyond loading the
fortune collection.

The implementation was built in small, observable steps:

1. Establish the visual language, brand assets, and landing-page story.
2. Create the ritual as a sequence of explicit screens.
3. Add the fortune collection as content data rather than hard-coding it into
   the UI.
4. Add the shake interaction and always-available tap fallback.
5. Add motion permission handling, haptics, reduced motion, keyboard behavior,
   and live announcements.
6. Add the fortune-number pause so the result has suspense before the slip
   appears.
7. Generate and cache a portrait share image, with browser-specific fallbacks.
8. Iterate on mobile layout, loading/error behavior, and the landing-page
   story.

The commit history reflects this incremental approach: layout fixes came
before the ritual refinements, then fortune content, buttons, loading, sharing,
and flow changes were layered on top.

## How the app works

### Landing page

[index.html](./index.html) is the editorial entry point. It contains:

- the hero message, “Food Luck Prosperity”;
- the CHARM/Sala Thai collaboration story;
- an explanation of the Thai *เซียมซี* (siam si) inspiration;
- a tactile shake-card demonstration;
- food illustrations;
- maker credits and external portfolio links.

[styles.css](./styles.css) owns the landing-page palette, typography, layout,
responsive behavior, and motion. The page uses the Lenis CDN for smooth
scrolling when the visitor has not requested reduced motion. The shake-card
demo is a poster image until it is activated, then plays its GIF for three
loops and returns to the poster.

### Ritual controller

[app.html](./app.html) defines the complete screen structure. Each screen is
present in the document and is shown or hidden by the controller rather than
being generated by a framework.

[app.js](./app.js) owns:

- screen navigation and reset behavior;
- fortune loading and selection;
- intention filtering;
- motion permission and `devicemotion` handling;
- shake-energy accumulation and bowl reveal choreography;
- reduced-motion behavior;
- haptic feedback where the browser supports it;
- accessible focus movement and live announcements;
- share-image preparation, sharing, and download fallbacks.

[app.css](./app.css) provides the mobile-first ritual frame and its states:
loading/revealing, energy buildup, cracking, opening, number reveal, completed
slip, error, and reset.

### Fortune data

[fortune.json](./fortune.json) is the content source. It contains a collection
of twelve records. Each record can include:

```json
{
  "id": 1,
  "slug": "golden-opening",
  "title": "The Golden Opening",
  "overall": "...",
  "love": "...",
  "wealth": "...",
  "workStudy": "...",
  "health": "...",
  "luckyDish": "Golden Puffs",
  "luckyDishNote": "...",
  "luckySign": null,
  "intents": ["money", "luck", "work", "food"],
  "image": "/assets/fortunes/food/golden puff.svg"
}
```

At runtime, the app:

1. fetches `fortune.json`;
2. validates that a non-empty collection was returned;
3. filters the collection by the visitor's selected intention when matching
   records exist;
4. chooses one record randomly from the resulting pool;
5. renders the selected record into the result slip. The markup includes a
   Thai-title slot for the planned bilingual result model.

The selection is independent for each attempt. No previous draw is stored.

## Interaction and resilience decisions

### Shake plus tap

On supported devices, the app requests motion permission from the “I'm ready”
tap, which satisfies iOS's requirement that permission requests happen inside a
user gesture. While the shake screen is active, acceleration deltas add to a
temporary shake-energy value. When the threshold is reached, the bowl charges,
cracks, shakes, opens, and transitions to the fortune number.

The bowl is also a button. A visitor can tap it instead when:

- the device has no motion sensor;
- motion permission is denied;
- the browser does not expose the motion API;
- the visitor is on desktop;
- shaking is impractical in the restaurant.

For local testing, the `s` key or Space key simulates shake energy on the shake
screen.

### Reduced motion

When `prefers-reduced-motion: reduce` is enabled, the app shortens the splash
timings and skips the shake choreography while preserving the meaning of the
ritual: the visitor still chooses an intention, begins the draw, and receives a
fortune.

### Accessibility

The app moves focus to each newly shown screen, uses semantic buttons for
actions, supports keyboard activation, and exposes status updates through the
`aria-live` element in [app.html](./app.html). Important announcements include:

- “The bowl is shaking.”
- “Your fortune is ready.”
- the selected fortune number and title;
- share, save, and error feedback.

Decorative artwork is hidden from assistive technology where appropriate, while
meaningful logos and controls have text alternatives.

### Loading and error behavior

Fortunes are loaded only when the visitor begins the ritual. A failed request,
invalid JSON shape, or empty collection moves the app to a recoverable error
screen instead of silently showing a fake result. “Try again” clears the
current draw, selected intention, shake state, and prepared share image.

### Sharing

The result image is prepared as soon as the fortune number screen appears so it
is usually ready during the user's share tap. The preferred path uses the Web
Share API with a PNG file. Other browsers receive a download/open-image
fallback, including the iOS long-press-to-save path. The generated filename is
`charm-fortune-XX.png`.

The current share renderer captures the rendered slip, including its
CHARM/Sala Thai identity. It never includes the private question or personal
data. A language-aware share composition is part of the bilingual product
requirement.

## Repository map

| Path | Purpose |
| --- | --- |
| [index.html](./index.html) | Public story and landing page |
| [styles.css](./styles.css) | Landing-page styling and responsive layout |
| [app.html](./app.html) | Ritual screen markup |
| [app.js](./app.js) | Ritual state, data, motion, accessibility, and sharing |
| [app.css](./app.css) | Ritual styling and animation states |
| [fortune.json](./fortune.json) | Twelve fortune records and content metadata |
| [asset/](./asset/) | Logos, bowl artwork, food illustrations, photos, and demos |
| [CONTEXT.md](./CONTEXT.md) | Domain vocabulary and product boundaries |
| [docs/](./docs/) | Design requirements, handoff requirements, and taskboard references |
| [CNAME](./CNAME) | Custom-domain configuration for static hosting |

## Run locally

Because the app fetches `fortune.json`, use a local HTTP server rather than
opening `app.html` directly with a `file://` URL.

With Python:

```bash
python3 -m http.server 8000
```

Then open:

- <http://localhost:8000/> for the story page;
- <http://localhost:8000/app.html> for the ritual.

No dependency installation is required. The landing page loads Lenis and DM
Mono from CDNs; the ritual itself has no runtime package dependency.

## Deployment

The repository is designed for static hosting. Publish the repository root
with the HTML, CSS, JavaScript, JSON, and `asset/` directory preserved at the
same relative paths. The [CNAME](./CNAME) file supplies the custom domain for
the configured host.

After deployment, test the actual production URL rather than only localhost:
browser security policies, motion permission behavior, Web Share availability,
font loading, and image paths can differ between environments.

## Credits

Created by **Pinky Arunwattanamongkol** and **Fai Chittayasodhara** with **Tom
Yum Lab**, in collaboration with **Sala Thai**.

## License and content

This repository contains project-specific brand assets, illustrations,
photography, fortune writing, and restaurant materials. Treat those assets and
content as project-owned unless a separate license says otherwise. Do not
reuse or redistribute them independently of the project without permission.
