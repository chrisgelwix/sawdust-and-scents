## Pages to People – Figma Slide Deck (Importer Plugin)

This creates a Figma “slide deck” (one **Frame** per slide) from the JSON at:
- `docs/Business Plans/pages_to_people_pitch_deck.json`

### Run in Figma

1. In Figma Desktop: **Plugins → Development → New Plugin…**
2. Choose **“Import plugin from manifest”**
3. Select:
   - `tools/figma/pages-to-people-slide-deck-plugin/manifest.json`
4. Run the plugin:
   - **Plugins → Development → Pages to People – JSON Slide Deck Importer**
5. Paste the JSON (from `docs/Business Plans/pages_to_people_pitch_deck.json`) into the textbox and click **Import**.

### What it imports

- **FRAME** → Figma `Frame` (1440×810)
- **TEXT** → Figma `Text` (supports `H1`, `H2`, `BODY`, `BODY_WHITE`)
- **RECTANGLE** → Figma `Rectangle` (supports `cornerRadius`, `shadow`, solid fill)
- **ELLIPSE** → Figma `Ellipse` (supports stroke + strokeWidth)

### Notes / limitations

- **Gradients**: JSON gradient tokens (like `gradientPrimary`) are approximated as a **solid fill using the first gradient stop**.
- **Fonts**: The plugin attempts to load fonts (e.g. **Inter**, **Playfair Display**). If a font style isn’t available, Figma will fall back.

