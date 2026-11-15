---
name: Circuit & Silicon
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#e0c0b1'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#a78b7d'
  outline-variant: '#584237'
  surface-tint: '#ffb690'
  primary: '#ffb690'
  on-primary: '#552100'
  primary-container: '#f97316'
  on-primary-container: '#582200'
  inverse-primary: '#9d4300'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00b07a'
  on-tertiary-container: '#003b26'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb690'
  on-primary-fixed: '#341100'
  on-primary-fixed-variant: '#783200'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
  copper-glow: '#FF8C00'
  circuit-trace: '#1E293B'
  circuit-cyan: '#22D3EE'
  pcb-green: '#059669'
  status-warning: '#F59E0B'
  status-error: '#EF4444'
  code-bg: '#0B0F17'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 26px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-meta:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.75rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style

The design system bridges the gap between hands-on electronic craftsmanship and high-velocity developer platforms (inspired by modern developer tooling aesthetics like Vercel and Linear). The identity centers on tactile engineering precision: microcontrollers (ESP32, STM32, Arduino), embedded firmware, IoT architecture, and high-frequency digital signal processing.

The aesthetic fuses **Modern Technical Minimalism** with **Developer-Centric High-Density UI**:
- **Tone:** Authoritative, razor-sharp, experimental yet production-grade, and deeply practical.
- **Visual Texture:** Dark tech slate/zinc canvases accented with delicate 1px grid guides, micro-dot matrices reminiscent of breadboards and PCB silk-screens, and luminous hardware telemetry accents.
- **Target Audience:** Embedded firmware engineers, hardware hackers, makers, robotics researchers, and developers bridging software and physical silicon.

## Colors

The palette is engineered for prolonged deep technical reading, schematic reviews, and code exploration.

- **Primary (`#F97316` / `#FF8C00`):** Electric Copper / Solder Amber. Represents raw silicon energy, active soldering iron glow, and primary calls to action.
- **Secondary (`#06B6D4` / `#22D3EE`):** Logic Cyan. Highlights embedded signals, clock lines, SPI/I2C buses, and high-frequency telemetry.
- **Tertiary (`#10B981`):** PCB Mask Green. Used for verified status badges, completed series milestones, and functional validation markers.
- **Neutral (`#0F172A`):** Deep Silicon Slate. The bedrock foundation that softens eye strain compared to harsh pitch-black, complemented by slate-800 surfaces and zinc-700 hairline borders.

### Surface Color Logic
- **Background Root:** Slate-950 (`#090D16`) with subtle radial illumination.
- **Surface Elevated:** Slate-900 (`#0F172A`) with hairline borders (`#1E293B`).
- **Surface Highlight / Interactive:** Slate-850 (`#172033`) transitioning to amber glow on focus.

## Typography

Typography prioritizes high-density technical comprehension across mixed alphanumeric and Japanese technical terminology (datasheet registers, C/C++ macros, pinouts, and mathematical formulas).

- **Headlines & Structural Titles (Inter):** Tight tracking (`-0.02em` to `-0.03em`) creates a compact, modern engineering header rhythm.
- **Body Copy (Inter paired with system sans-serif):** Generous line height (1.6x to 1.7x font size) balances Japanese kanji/kana density with Latin code identifiers.
- **Labels, Telemetry, and Metadata (JetBrains Mono):** Applied universally to technical specifications, component serial numbers (`2SC1815`, `ESP32-S3`, `STM32CubeIDE`), pin mappings, timestamps, and series step counters.

## Layout & Spacing

A structured 12-column responsive fluid grid aligns high-density technical cards, schematics, and interactive components.

- **Canvas Limits:** Maximum content constraint is `1280px` for portal discovery feeds and `820px` for technical long-form articles to preserve optimal typographic line length (65–75 characters).
- **Rhythm & Alignments:** Strict 4px base coordinate system with 8px increments. Padding inside interactive elements remains tight (`space-xs` to `space-sm`), while section partitions breathe with `space-xl` and `space-2xl`.
- **Responsive Adaptations:**
  - **Mobile (< 768px):** 4 columns, single-column stacked series flow, horizontal scroll tags, flush cards with 16px edge gutters.
  - **Tablet (768px – 1024px):** 8 columns, 2-column post card matrices.
  - **Desktop (> 1024px):** 12 columns, 3 or 4-column article grids, dual-column laboratory series breakout layouts.

## Elevation & Depth

Visual hierarchy leverages **Tonal Layering** coupled with **Subtle Low-Contrast Outlines** and **Localized Phosphor Shadows**:

- **Substrate (Level 0):** Background matte at Slate-950 (`#090D16`) with a 24px micro-grid dot pattern rendered in 4% opacity white.
- **Cards & Enclosures (Level 1):** Solid Slate-900 (`#0F172A`) framed with a razor-thin 1px solid border (`#1E293B`).
- **Interactive Hover & Overlay (Level 2):** Slate-850 surface accented with subtle 1px border highlights (`#334155`) and an ambient, ultra-diffused amber/cyan drop glow: `0 12px 32px -8px rgba(249, 115, 22, 0.12)`.
- **Glassmorphism Accents:** Navigation headers, floating toolbar badges, and interactive sticky filters utilize backdrop blur (`backdrop-blur-md` at 12px) paired with 75% alpha background fills (`rgba(15, 23, 42, 0.75)`).

## Shapes

The design system adopts **Soft (`1`)** geometry:
- Standard buttons, badges, and card boundaries use crisp `4px` (`0.25rem`) to `8px` (`0.5rem`) corner radiuses.
- This creates an industrial, instrumentation-grade feel that evokes physical IC chips, modular terminal blocks, and laboratory oscilloscopes.
- Large circular pills are reserved strictly for taxonomy tags, status pills, and numeric step badges.

## Components

### 1. Buttons & Action Links
- **Primary CTA:** Solid copper background (`#F97316`), bold text in Slate-950, 6px border-radius, hairline top-edge reflection (`inset 0 1px 0 rgba(255,255,255,0.2)`), with subtle hover lift and orange phosphor glow.
- **Secondary / Ghost:** Transparent background with 1px border in Slate-700 (`#334155`), JetBrains Mono label in Slate-200. On hover, transitions border to Logic Cyan (`#06B6D4`) with 5% cyan fill tint.
- **Terminal Run Action:** Dark button containing a monospace prompt symbol (`$`, `>`), paired with an animated pulse dot.

### 2. Technical Article & Project Cards
- **Card Housing:** Contained Slate-900 surface with 1px zinc/slate border. Top image thumbnail features a 16:9 ratio with subtle vignette and dark-mode color balance.
- **Card Header & Chips:** Integrated hardware categories (`ESP32`, `KiCad`, `STM32`, `AI×Dev`) displayed in high-contrast miniature badges (JetBrains Mono, 10px uppercase, 0.5px letter-spacing).
- **Metadata Line:** Date, reading time, and difficulty level separated by sleek middle-dot separators or pipe delimiters (`|`).

### 3. Laboratory / Series Project Containers
- Full-width breakout containers styled as modular bench equipment.
- Header features an amber or cyan left-accent border line (3px width) with an integrated breadcrumb indicating progress (`#1 ~ #4 収録`, `完結した連載`).
- Split layout: Overview context on the left; structured, clickable episode chapters with interactive pin indicators on the right.

### 4. Code Blocks & Schematic Callouts
- Pure Slate-950 enclosure with an integrated top chrome bar featuring component filename, copy action, and syntax chip (e.g., `main.c`, `sdkconfig`).
- Monospace line numbering in low-contrast Slate-600 with syntax highlighting matching the core palette (Orange for keywords, Cyan for registers/functions, Green for string literals).

### 5. Filter Chips & Hardware Badges
- Compact rectangular pills with 4px border-radius. Active state features a 1px border in Amber (`#F97316`) with an amber-tinted background (`rgba(249, 115, 22, 0.1)`). Inactive chips sit quietly on Slate-850 with neutral typography.