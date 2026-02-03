# Phase 18: UI/UX Design Guidelines

## 18.1 Overview
This phase covers the visual design system based on the **Neon Green Dark Mode** theme implemented across all 72 screens.

---

## 18.2 Color Palette - Dark Mode (Primary)

### Core Dark Backgrounds
| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Background | `#09090b` | `--bg-dark` | Page background (Zinc 950) |
| Card | `#18181b` | `--bg-card` | Card surfaces (Zinc 900) |
| Card Hover | `#27272a` | `--bg-card-hover` | Hover states (Zinc 800) |

### Brand Colors - Neon Green
| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Primary** | `#B9FF66` | `--primary` | **Neon Green** - Buttons, links, active states |
| Primary Foreground | `#000000` | `--primary-fg` | Text on primary buttons |
| Primary Glow | `#B9FF6620` | - | Subtle glow shadows |

### Accent Colors
| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Blue | `#38bdf8` | `--accent-blue` | Info, links, charts |
| Purple | `#c084fc` | `--accent-purple` | Analytics, special items |
| Rose | `#fb7185` | `--accent-rose` | Errors, critical alerts |
| Orange | `#fb923c` | `--accent-orange` | Warnings, pending states |

### Typography Colors
| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Text Primary | `#ffffff` | `--text-primary` | Main headings, body |
| Text Muted | `#a1a1aa` | `--text-muted` | Descriptions, labels (Zinc 400) |
| Text Disabled | `#52525b` | - | Disabled elements (Zinc 600) |

---

## 18.3 Semantic Status Colors

### Status Badges (Dark Mode)
```css
/* Success - Neon Green based */
.badge-success {
  background: rgba(185, 255, 102, 0.15);
  color: #B9FF66;
  border: 1px solid rgba(185, 255, 102, 0.3);
}

/* Warning - Orange */
.badge-warning {
  background: rgba(251, 146, 60, 0.15);
  color: #fb923c;
  border: 1px solid rgba(251, 146, 60, 0.3);
}

/* Danger - Rose */
.badge-danger {
  background: rgba(251, 113, 133, 0.15);
  color: #fb7185;
  border: 1px solid rgba(251, 113, 133, 0.3);
}

/* Info - Blue */
.badge-info {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

/* Neutral */
.badge-neutral {
  background: rgba(161, 161, 170, 0.15);
  color: #a1a1aa;
  border: 1px solid rgba(161, 161, 170, 0.3);
}
```

### Status Usage
| Status | Color | Badge Style |
|--------|-------|-------------|
| Active | 🟢 Neon Green | `badge-success` |
| Completed | 🟢 Neon Green | `badge-success` |
| In Progress | 🔵 Blue | `badge-info` |
| Pending | 🟠 Orange | `badge-warning` |
| Rejected | 🔴 Rose | `badge-danger` |
| Draft | ⚪ Muted | `badge-neutral` |
| Inactive | ⚫ Neutral | `badge-neutral` |

---

## 18.4 Typography

### Font Family
```css
font-family: 'Outfit', sans-serif;
-webkit-font-smoothing: antialiased;
```

### Type Scale
| Level | Size | Weight | Color | Usage |
|-------|------|--------|-------|-------|
| H1 | 32px | 700 | white | Page titles |
| H2 | 24px | 600 | white | Section headers |
| H3 | 20px | 600 | white | Card headers |
| H4 | 16px | 600 | white | Sub-sections |
| Body | 16px | 400 | white | Default text |
| Small | 14px | 400 | muted | Secondary text |
| Caption | 12px | 400 | muted | Labels, hints |
| Mono | 14px | 400 | neon | IDs, codes, GUAIs |

---

## 18.5 Button Styles

### Primary Button (Neon Green)
```css
.btn-primary {
  background: #B9FF66;
  color: #000000;
  font-weight: 600;
  border-radius: 8px;
  padding: 10px 20px;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #a3e85a;
  box-shadow: 0 0 20px rgba(185, 255, 102, 0.3);
}
```

### Secondary Button (Ghost)
```css
.btn-secondary {
  background: transparent;
  color: #a1a1aa;
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 10px 20px;
}

.btn-secondary:hover {
  background: #27272a;
  color: #ffffff;
}
```

### Danger Button
```css
.btn-danger {
  background: rgba(251, 113, 133, 0.15);
  color: #fb7185;
  border: 1px solid rgba(251, 113, 133, 0.3);
}

.btn-danger:hover {
  background: rgba(251, 113, 133, 0.25);
}
```

---

## 18.6 Card Styles

### Standard Card
```css
.card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 20px;
}

.card:hover {
  background: #1f1f23;
  border-color: #3f3f46;
}

/* Card with Neon Accent */
.card-accent {
  border-left: 3px solid #B9FF66;
}

/* Glassmorphism Card */
.card-glass {
  background: rgba(24, 24, 27, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Stat Cards
```css
.stat-card {
  background: linear-gradient(135deg, #18181b 0%, #1f1f23 100%);
  border: 1px solid #27272a;
}

.stat-card .value {
  font-size: 28px;
  font-weight: 700;
  color: #B9FF66;
}

.stat-card .label {
  color: #a1a1aa;
  font-size: 14px;
}
```

---

## 18.7 Form Elements

### Input Fields
```css
.input {
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 8px;
  color: #ffffff;
  padding: 10px 14px;
}

.input:focus {
  border-color: #B9FF66;
  outline: none;
  box-shadow: 0 0 0 2px rgba(185, 255, 102, 0.2);
}

.input::placeholder {
  color: #52525b;
}
```

### Labels
```css
.label {
  color: #a1a1aa;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
}
```

---

## 18.8 Table Styles

```css
.table {
  background: #18181b;
  border-radius: 12px;
  overflow: hidden;
}

.table th {
  background: #09090b;
  color: #a1a1aa;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #27272a;
}

.table td {
  padding: 14px 16px;
  border-bottom: 1px solid #27272a;
  color: #ffffff;
}

.table tr:hover {
  background: #1f1f23;
}

/* Active Row */
.table tr.active {
  background: rgba(185, 255, 102, 0.05);
  border-left: 3px solid #B9FF66;
}
```

---

## 18.9 Sidebar & Navigation

```css
.sidebar {
  background: #09090b;
  border-right: 1px solid #27272a;
  width: 64px; /* Collapsed */
}

.nav-item {
  color: #a1a1aa;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #27272a;
  color: #ffffff;
}

.nav-item.active {
  background: rgba(185, 255, 102, 0.1);
  color: #B9FF66;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: #B9FF66;
  border-radius: 0 4px 4px 0;
}
```

---

## 18.10 Scrollbar (Custom)

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a1a1aa;
}
```

---

## 18.11 Icons

### Icon Library: Lucide React

### Icon Colors
| Context | Color | Hex |
|---------|-------|-----|
| Default | Muted | `#a1a1aa` |
| Active | Neon Green | `#B9FF66` |
| Hover | White | `#ffffff` |
| Success | Neon Green | `#B9FF66` |
| Warning | Orange | `#fb923c` |
| Error | Rose | `#fb7185` |
| Info | Blue | `#38bdf8` |

---

## 18.12 Shadows & Glows

```css
/* Neon Glow (for important elements) */
.glow-neon {
  box-shadow: 0 0 20px rgba(185, 255, 102, 0.2);
}

/* Subtle Card Shadow */
.shadow-card {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

/* Active Element Glow */
.glow-active {
  box-shadow: 0 0 0 2px rgba(185, 255, 102, 0.3);
}
```

---

## 18.13 Light Mode (Alternative)

For future light mode implementation:

```css
:root.light {
  --bg-dark: #fafafa;
  --bg-card: #ffffff;
  --bg-card-hover: #f4f4f5;
  --text-primary: #09090b;
  --text-muted: #71717a;
  --primary: #65a30d;        /* Lime 600 - pairs with neon */
  --primary-fg: #ffffff;
}
```

| Light Mode | Suggestion |
|------------|------------|
| Background | `#fafafa` (Zinc 50) |
| Cards | `#ffffff` (White) |
| Primary | `#65a30d` (Lime 600 - keeps green theme) |
| Text | `#09090b` (Zinc 950) |
| Muted | `#71717a` (Zinc 500) |

---

## 18.14 Responsive Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| `xs` | < 640px | Mobile |
| `sm` | 640-768px | Large mobile |
| `md` | 768-1024px | Tablet |
| `lg` | 1024-1280px | Small desktop |
| `xl` | > 1280px | Large desktop |

---

## 18.15 Animation Guidelines

```css
/* Standard Transition */
transition: all 0.2s ease;

/* Hover Scale */
transform: scale(1.02);

/* Neon Pulse Animation */
@keyframes neon-pulse {
  0%, 100% { box-shadow: 0 0 5px rgba(185, 255, 102, 0.3); }
  50% { box-shadow: 0 0 20px rgba(185, 255, 102, 0.5); }
}
```

---

*Theme: Neon Green Dark Mode*
*Primary: `#B9FF66` | Background: `#09090b` | Font: Outfit*
