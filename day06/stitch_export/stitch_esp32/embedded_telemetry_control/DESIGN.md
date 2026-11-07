---
name: Embedded Telemetry & Control
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
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#e29100'
  on-tertiary-container: '#523200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: JetBrains Mono
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  metric-val:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.03em
  metric-val-mobile:
    fontFamily: JetBrains Mono
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
  code-terminal:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system targets local-network embedded Web experiences running directly on resource-constrained microcontrollers like the ESP32-S3. The personality blends high-precision industrial instrumentation with sleek, contemporary developer tooling. It evokes immediacy, absolute operational clarity, and engineered reliability.

The aesthetic fuses **Tactile Engineering** and **Industrial Minimalism**:
- Dark-mode core optimized for low-power OLED/LCD viewing and field operation.
- Monospaced, zero-latency telemetry readouts reflecting hardware registers, pin status, and stream metrics.
- Physical mechanical cues—recessed parameter trays, rotary/switch states, and tactile toggle surfaces—translated cleanly into lightweight CSS without client-heavy rendering burdens.
- Dual-script parity: effortless typography balance across technical English identifiers and Japanese (CJK) kanji/kana telemetry labels.

## Colors

The palette is engineered for high-contrast visibility against deep technical backdrops, minimizing eye fatigue during bench testing and field deployment.

- **Primary (`#10b981` Emerald):** Represents safe sensor operational bounds, healthy wireless connection states (Wi-Fi/BLE), active GPIO pins, and positive system confirmation.
- **Secondary (`#06b6d4` Cyan):** Designates real-time environmental data streams (humidity, airflow, telemetry graph lines), auxiliary statuses, and secondary interactive switches.
- **Tertiary (`#f59e0b` Amber):** Denotes sensor threshold alerts (e.g., CO2 elevation, thermal throttle warning, non-critical buffer overflow). A complementary danger hue (`#ef4444` Crimson) handles hard fault conditions, memory allocation panic, and disconnect alerts.
- **Neutral (`#0f172a` Deep Slate/Obsidian):** Forms the structured hierarchy of background chassis, recessed bays, and border boundaries.

### State & Surface Distribution
- **Chassis Background (`#090d16`):** The master canvas tone.
- **Card/Bay Surface (`#0f172a`):** Segmented operational cards.
- **Recessed Surface (`#050811`):** Inset telemetry logs, terminal output, and tactile switch tracks.
- **High-contrast Text (`#f8fafc`):** Primary numeric readouts and active states.
- **Muted Technical Text (`#64748b`):** Metric units, register addresses, and auxiliary Japanese subtitles.

## Typography

The type system balances industrial telemetry precision with natural international rendering:

- **JetBrains Mono:** Dedicated to numeric telemetry values, unit suffixes, hardware addresses, IP/MAC labels, and system status indicators. Tabular numerals ensure jitter-free real-time value updates.
- **Space Grotesk:** Drives panel titles, module labels, and functional section headers, infusing a retro-futuristic laboratory tone.
- **Noto Sans:** Serves descriptive body text, instructional copy, and Japanese glyphs (Kanji, Hiragana, Katakana) with uniform stroke clarity and native legibility on both high-DPI screens and compact embedded displays.

### Japanese Script Handling
When rendering bilingual content:
- English system tags use uppercase `label-caps` (`TEMP`, `CO2 CONC`, `WIFI STATUS`).
- Japanese translations pair beneath or adjacent using `body-sm` (`温度`, `二酸化炭素濃度`, `接続状態`) with identical line-height alignment.

## Layout & Spacing

The portal adopts an auto-fitting, module-based dashboard layout utilizing a compact 4/8/12-column dynamic grid. Layout rhythm prioritizes glanceability, high visual density, and touch-target clearance on mobile phones or field tablets.

### Responsive Breakpoints & Adaptations
- **Mobile (< 640px):** Single-column stack. Margins reduce to `1rem`, card gaps to `0.75rem`. Vital metrics (Temperature, CO2, Humidity) stack vertically or in a tight 2-column grid. Control toggles expand to full touch targets (minimum 44px height).
- **Tablet (640px - 1024px):** 2-to-3 column dashboard grid. Primary environmental metrics occupy prominent top cards; calibration toggles and raw log windows sit side-by-side below.
- **Desktop / Bench Workstation (> 1024px):** 4-column balanced grid with fixed telemetry header (displaying ESP32-S3 uptime, RSSI, heap memory, and chip temperature).

All inner module paddings adhere to `space-md` (`1rem`) to keep the interface compact, conserving memory footprint and CSS size.

## Elevation & Depth

Visual hierarchy reflects physical equipment chassis rather than virtual floating layers. Depth is constructed through **Tonal Insets and Crisp Low-Contrast Outlines**:

- **Ground Level (Base Canvas):** `#090d16`. Flat, dark, raw frame.
- **Instrument Enclosures (Dashboard Cards):** `#0f172a` bordered with a 1px solid stroke of `#1e293b`. No soft diffuse dropshadows; separation relies on edge contrast and structural borders.
- **Recessed Channels (Trays & Toggles):** Inputs, toggle run-tracks, and telemetry mini-charts are visually recessed into the chassis using `#050811` with a fine inner boundary border (`#1e293b`).
- **Active State Glow:** Active sensors and enabled toggles emit a constrained 1px to 2px edge illumination using primary `#10b981` or cyan `#06b6d4`, simulating backlit instrument LEDs rather than broad blur-glass dropshadows.

## Shapes

The shape system employs strict structural discipline (`roundedness: 1` — Soft / Industrial).

- **Outer Enclosures & Metric Cards:** `0.25rem` (4px) corner radii. Maintains an engineered, fabricated PCB-chassis contour.
- **Buttons, Toggles, and Badges:** `0.25rem` corner radius. Crisp, bevel-inspired edges avoiding bulbous circular forms.
- **Sensor Status LEDs:** Exact circles (50% radius) kept small (6px to 8px) with sharp perimeter edges.
- **Dividers & Metric Separators:** 1px hairline rules without soft feathering.

## Components

### Telemetry Metric Cards
- **Structure:** Surface background (`#0f172a`), 1px outline (`#1e293b`). Compact header row containing metric ID (`TEMP`, `HUM`, `CO2`), optional Japanese label (`温度`, `湿度`), and active sensor status dot.
- **Data Display:** Prominent `metric-val` font in JetBrains Mono. Primary value in `#f8fafc`, accompanied by a unit suffix (`°C`, `%RH`, `ppm`) in muted `#64748b` or accent cyan `#06b6d4`.
- **Threshold Cue:** Top accent strip (2px) shifting dynamically to emerald (nominal), amber (elevated), or red (critical).

### Tactile Hardware Toggles
- **Track:** Recessed slot (`#050811`) with 1px border. Dimensions: 44px × 24px.
- **Thumb:** 18px × 18px block with slight tactile vertical grip lines (achieved via subtle CSS gradients). Switches smoothly with a mechanical snap transition (0.15s ease-out).
- **Engaged State:** Track boundary transitions to emerald `#10b981`, thumb activates a high-contrast accent pip.

### Interactive Buttons & Triggers
- **Primary (Action/Calibrate):** Filled `#10b981` with dark ink `#050811` JetBrains Mono text. Pressed state pushes inward 1px (`transform: translateY(1px)`).
- **Secondary (Zero/Tare/Reboot):** Dark base (`#0f172a`), 1px border (`#334155`), text `#94a3b8`. Hover transitions border to cyan `#06b6d4`.

### Chips & Status Indicators
- **Pin / Register Badges:** Compact monospace chips with `#050811` background, 1px border, and text formatted as `GPIO_04: HIGH` or `HEAP: 248KB`.
- **Japanese Status Badges:** Compact pill or boxed label: `[ 正常 ]` (Normal) in emerald, `[ 警告 ]` (Warning) in amber.

### Input Fields & Parameter Steppers
- Inset box (`#050811`) with border `#1e293b`. Focused state yields a 1px border illumination of `#06b6d4`.
- Stepper buttons (+/-) flank numeric thresholds (e.g., CO2 Alarm Trigger: 1000 ppm) with instant tactile state feedback.

### Terminal & Serial Log Viewports
- Dedicated dark window (`#050811`) with monospace code output (`code-terminal`).
- Green `#10b981` system prompts (`esp32-s3:~$`) and automatic autoscroll toggle for live diagnostic output over WebSockets/SSE.