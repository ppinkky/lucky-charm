# UX/UI Designer Requirements

Track the UX/UI work in [UX/UI designer checklist: Thai fortune ritual experience](https://github.com/ppinkky/lucky-charm/issues/9).

## Scope

Own the user flow, information architecture, responsive layouts, interaction states, accessibility behavior, copy placement, and implementation handoff. Use the [graphic designer requirements](graphic-designer-requirements.md) for visual assets and styling inputs.

## Required flow

- QR code and NFC open the experience directly.
- English is primary; `ไทย` is available on the opening screen.
- The visitor privately thinks of a question. There is no question input.
- Opening copy: `Think of a question.` and `Hold it quietly in your mind. Nothing is typed or saved.`
- Primary action: `Begin`.
- Bowl action: `Shake the bowl (or tap the bowl instead)`.
- Motion permission is optional; tap is always available.
- The bowl interaction locks during the 2-4 second reveal.
- The result is English-first; Thai is available by swipe and `ภาษาไทย` control.
- Result actions are `Share fortune`, `Download image`, and `Try again`.
- Retry resets the ritual while preserving language.

## State and accessibility coverage

Design loading, motion permission, denied permission, no sensor, tap fallback, sound muted/enabled, reduced motion, keyboard focus, screen-reader order, announcements, asset failure, retry, reveal, and completed states.

Required announcements:

- `The bowl is shaking.`
- `The bowl is cracking.`
- `Your fortune is ready.`

## Responsive handoff

Provide annotated layouts for 320px, 390px, 430px, 768px, and 1440px widths. Document safe areas, content width, touch targets, focus rings, overflow behavior, one-handed mobile reach, and desktop click behavior.

## Fortune and sharing UX

- The 12 fortune records contain number, name, overall prediction, love, wealth, work and study, health, and optional lucky dish.
- English and Thai are views of the same selected fortune.
- Long content must remain readable; do not force both languages into one crowded view.
- The visible language determines the shared image language.
- Share output targets 1080 x 1920 pixels and includes the fortune and restaurant logo only.
- Sharing must not include the private question or personal data.
