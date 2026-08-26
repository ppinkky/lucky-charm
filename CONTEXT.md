# Fortune Ritual Context

## Glossary

- **Visitor**: A restaurant guest who opens the experience through the project's QR code or NFC tag.
- **Private question**: The question a visitor holds in mind before beginning. It is never typed, sent, stored, or used as input.
- **Fortune bowl**: The illustrated ritual object that the visitor shakes or taps to begin a draw.
- **Fortune record**: One of the 12 prepared outcomes. Each record has a number, fortune name, overall prediction, love, wealth, work and study, health, and an optional lucky dish.
- **Fortune slip**: The revealed presentation of a fortune record. It has an English view and a Thai view of the same outcome.
- **Ritual**: The visitor's short interaction with the fortune bowl, including shaking or tapping, the bowl's crack, and the fortune slip's emergence.
- **Result**: The settled fortune slip after the ritual completes. English is primary; Thai is available through swipe or the `ภาษาไทย` control.
- **Attempt**: One independent ritual and draw. An attempt selects from all 12 fortune records and does not depend on prior attempts.
- **Share image**: The portrait representation of the currently visible fortune slip, including the restaurant logo and no private question or personal data.
- **Language control**: The compact `ไทย` or `ภาษาไทย` control that makes Thai available without changing which fortune record was drawn.
- **Restaurant identity**: The supplied restaurant logo, the only required branded identity on the fortune slip and share image.
- **Fortune categories**: The prepared sections of a fortune record: overall prediction, love, wealth, work and study, health, and lucky dish when applicable.

## Domain Boundaries

This is an interactive art experience made with a Thai restaurant in New York. It invites reflection, fun, and a little luck. It does not claim to provide guaranteed prediction or collect the visitor's private question.

## Product Boundaries

- English is the primary interface and fortune language. Thai is available through the language control and on the fortune result.
- The 12 fortune records, bowl illustration, restaurant logo, and visual art direction are supplied project inputs.
- A draw is random across all 12 fortune records. Previous attempts do not affect later attempts.
- The experience is mobile-first, with desktop click interaction as a complete fallback.
- The private question, visitor identity, fortune history, and analytics are outside the experience.
