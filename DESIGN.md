# Design System: Socrates AI
**Project ID:** local-socrates-ai

## 1. Visual Theme & Atmosphere
The Socrates AI design system embodies a **Clean, Minimalist, and Educational** atmosphere. It prioritizes clarity and focus, using a balanced light-theme aesthetic with generous whitespace to facilitate deep thinking and structured dialogue. The interface feels approachable yet professional, mirroring a modern scholarly environment.

## 2. Color Palette & Roles

### Core Colors
* **Vivid Azure Blue (#3b82f6):** The `Primary` brand color used for key actions, focus states, and meaningful highlights.
* **Pure White (#ffffff):** The `Background` color, providing a blank canvas for discourse and content clarity.
* **Deep Charcoal (#020617):** The `Foreground` color used for primary text and high-contrast elements.
* **Soft Fog Gray (#f1f5f9):** A `Secondary` and `Muted` color used for sidebars, backgrounds of secondary containers, and subtle UI divisions.

### Functional Accents
* **Vibrant Emerald Green (#10b981):** A `Success` color representing "Growth" and "Resolution." Used for progress gauges and resolved status indicators.
* **Crimson Warning (#ef4444):** A `Destructive` color used for errors or dangerous actions like deleting a session.
* **Slate Border (#e2e8f0):** Used for subtle interface structure and element containment.

## 3. Typography Rules
* **Font Family:** `Pretendard Variable`. A modern, high-legibility sans-serif that ensures professional clarity across all weights.
* **Weight Usage:** 
    * **Bold (700):** Used for headers, titles, and emphasized primary labels.
    * **Medium (500):** Used for active states, UI buttons, and semi-bold highlights.
    * **Regular (400):** Used for body copy and general interface text.
* **Leading & Kerning:** Uses a comfortable `1.6` line-height for readability and a subtle `-0.02em` letter-spacing for a modern, compact character in display text.

## 4. Component Stylings
* **Buttons:**
    * **Shape:** Subtly rounded corners (`radius-lg` or roughly `8px`).
    * **Primary Style:** Solid Azure Blue background with white text.
    * **Secondary/Icon Style:** Transparent or light gray backgrounds with muted text that shifts to high contrast on hover.
* **Chat Bubbles:**
    * **User:** Soft Fog Gray background with a "tail" accent on the bottom right. Generously rounded (2xl) except for the accent corner.
    * **AI:** Pure White background with subtle borders, emphasizing a clean, "source-of-truth" feel.
* **Inputs/Forms:**
    * **Shape:** Generously rounded xl corners (`0.75rem`).
    * **Style:** Floating shadow (`shadow-input`) and subtle borders. High background contrast ensures focus.
* **Cards/Containers:**
    * **Shape:** Generous rounding (`--radius: 1rem`).
    * **Shadows:** Whisper-soft, low-opacity diffused shadows that provide subtle depth without visual clutter.

## 5. Layout Principles
* **Whitespace Strategy:** Ample margins and padding (`p-4` to `p-6` in main views) to prevent visual density.
* **Sidebar Layout:** A collapsible structure (`300px` to `56px`) that allows users to toggle between focus mode and navigation mode.
* **Alignment:** Centered container strategy for content-heavy views to maintain reading focus.
