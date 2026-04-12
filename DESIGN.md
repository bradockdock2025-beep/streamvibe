# Design System Strategy: High-End Audio Editorial

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Sanctuary"**

This design system is built to transcend the "utility" feel of standard streaming apps. It is an immersive, editorial experience that treats audio content as sacred. By moving away from rigid grids and standard containers, we create a "Digital Sanctuary"—a space that feels deep, quiet, and premium. 

We break the "template" look through **Intentional Asymmetry**. Hero sections use large-scale typography that overlaps high-fidelity imagery, while content cards leverage varying vertical rhythms. This system prioritizes negative space and tonal depth over structural lines, ensuring the focus remains on the "Vibe" and the "Message."

---

## 2. Colors: Tonal Depth & Vibrancy
Our palette is anchored in a "Deep Dark" theme, utilizing `background: #131313` to create a void where content can truly shine.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are strictly prohibited for sectioning or card definition. Boundaries must be defined through:
*   **Background Shifts:** Use `surface_container_low` on top of a `surface` background to define a zone.
*   **Tonal Transitions:** Use soft gradients or shadows to imply a boundary without a hard line.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of "Obsidian Glass."
*   **Base:** `surface` (#131313)
*   **Elevated Sections:** `surface_container` (#201f1f)
*   **Floating Interstitials:** `surface_container_highest` (#353534)
Each inner container should use a progressively lighter or darker tier to signify focus, creating a "nested" depth that feels organic rather than mechanical.

### The "Glass & Gradient" Rule
To elevate the experience, utilize **Glassmorphism**. Floating elements (like player bars or menu overlays) should use `surface_variant` with a 60% opacity and a `backdrop-blur` of 20px. 
*   **Signature Texture:** Main CTAs (Primary) must use a subtle linear gradient from `primary` (#ffb3b1) to `primary_container` (#ff535b) at 135 degrees. This adds "soul" and prevents the vibrant red from feeling flat or aggressive.

---

## 3. Typography: The Editorial Voice
We utilize a pairing of **Manrope** for impact and **Inter** for utility.

*   **Display & Headlines (Manrope):** These are our "Voice." `display-lg` (3.5rem) should be used with tight letter-spacing (-0.02em) to create an authoritative, premium feel. Headlines often overlap images to create depth.
*   **Body & Labels (Inter):** These are our "Function." `body-md` (0.875rem) provides maximum legibility for long-form descriptions.
*   **The Hierarchy Goal:** Use high contrast in scale. A `display-lg` headline next to a `label-sm` metadata tag creates a sophisticated editorial layout common in high-end fashion and lifestyle digital journals.

---

## 4. Elevation & Depth: Tonal Layering
Depth is achieved through lighting, not lines.

*   **The Layering Principle:** Instead of a shadow, place a `surface_container_lowest` (#0e0e0e) card inside a `surface_container` (#201f1f) section. The natural contrast creates a "sunken" or "lifted" effect.
*   **Ambient Shadows:** For floating elements like a "Now Playing" bar, use a shadow with a 40px blur, 0% spread, and 8% opacity. The shadow color should be derived from `on_surface` to simulate real-world light absorption.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` at 15% opacity. Never use 100% opaque borders.

---

## 5. Components: Refined Interaction

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`). Border-radius: `lg` (0.5rem). High-contrast `on_primary_container` text.
*   **Secondary/Ghost:** `outline` token at 20% opacity. Text in `on_surface`. On hover, transition to a subtle `surface_bright` background.

### Cards & Lists
*   **The Divider Rule:** Forbid the use of divider lines. Separate list items using 16px of vertical white space or a subtle background shift between `surface_container_low` and `surface_container_lowest`.
*   **Media Overlays:** All images must use a 40% to 80% black gradient overlay (bottom-to-top) to ensure `on_surface` (white) typography remains legible regardless of the image content.

### Floating Player (Special Component)
*   **Style:** Glassmorphic container using `surface_container_high` at 70% opacity + blur.
*   **Accent:** Use a 2px "Top Glow" using a gradient of `primary` at 30% opacity to 0% opacity.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use intentional white space (Margins of 48px+ on desktop) to allow the "premium" feel to breathe.
*   **Do** use asymmetrical layouts where text sits 1/3 into an image.
*   **Do** use `primary_container` for micro-interactions (like a pulsing "Live" icon).

### Don't:
*   **Don't** use pure #000000 for backgrounds; use our `surface` (#131313) to maintain depth in the "Dark Mode."
*   **Don't** use standard Material Design "Drop Shadows." Keep shadows diffused and "ambient."
*   **Don't** use icons with a stroke weight thinner than 1.5px; thin icons get lost in the deep dark theme.
*   **Don't** center-align everything. Use left-aligned editorial grids to maintain a high-end feel.