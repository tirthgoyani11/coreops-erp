# 02: Design System — CoreOps ERP v3.0

> **Last Verified**: February 15, 2026 — All tokens, patterns, and guidelines reviewed against codebase

## 2.1 UX Philosophy
> *"Complex Made Invisible" — Every feature is powerful, but the interface always feels simple.*

### Core Principles
| # | Principle | Rule |
|---|-----------|------|
| 1 | **3-Click Rule** | 80% of frequent tasks completable in ≤ 3 clicks |
| 2 | **Progressive Disclosure** | Show basic → reveal advanced on demand |
| 3 | **Contextual Intelligence** | AI suggests next action based on context |
| 4 | **Undo > Confirm** | Let users act → show undo toast (no "Are you sure?") |
| 5 | **Smart Defaults** | Pre-fill using history, patterns, preferences |
| 6 | **Inline Editing** | Click on any field → edit in place → auto-save |
| 7 | **Zero Training** | Interactive onboarding tour (react-joyride) |
| 8 | **Keyboard First** | Every action via shortcut. Power users never need a mouse |
| 9 | **Role Simplification** | Each role sees ONLY what they need |
| 10 | **Consistency** | Every entity page uses the same layout pattern |

---

## 2.2 Color Palette

### Brand Colors
| Name | Light Mode | Dark Mode | CSS Variable | Usage |
|------|-----------|-----------|-------------|-------|
| Primary | `#6366f1` (Indigo 500) | `#818cf8` (Indigo 400) | `--primary` | Buttons, links, focus rings |
| Primary Hover | `#4f46e5` (Indigo 600) | `#6366f1` (Indigo 500) | `--primary-hover` | Hover states |
| Secondary | `#8b5cf6` (Violet 500) | `#a78bfa` (Violet 400) | `--secondary` | Accents, badges |
| Background | `#ffffff` | `#0f172a` (Slate 900) | `--background` | Page background |
| Surface | `#f8fafc` (Slate 50) | `#1e293b` (Slate 800) | `--surface` | Cards, panels |
| Surface Elevated | `#ffffff` | `#334155` (Slate 700) | `--surface-elevated` | Modals, popovers |
| Border | `#e2e8f0` (Slate 200) | `#334155` (Slate 700) | `--border` | Borders, dividers |
| Text Primary | `#0f172a` (Slate 900) | `#f1f5f9` (Slate 100) | `--text-primary` | Headings, body text |
| Text Secondary | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | `--text-secondary` | Labels, descriptions |
| Text Muted | `#94a3b8` (Slate 400) | `#64748b` (Slate 500) | `--text-muted` | Placeholders, hints |

### Status Colors
| Status | Color | Badge | Usage |
|--------|-------|-------|-------|
| Active / Success | `#22c55e` (Green 500) | 🟢 | Active assets, completed tickets |
| Warning / Pending | `#eab308` (Yellow 500) | 🟡 | Pending approval, low stock |
| Error / Critical | `#ef4444` (Red 500) | 🔴 | Overdue, critical, errors |
| Info / In Progress | `#3b82f6` (Blue 500) | 🔵 | In progress, informational |
| Neutral / Inactive | `#64748b` (Slate 500) | ⚪ | Decommissioned, closed |

### Chart Colors (Sequential Palette)
```
#6366f1, #8b5cf6, #ec4899, #f43f5e, #f97316, #eab308, #22c55e, #14b8a6
```

### Dark Mode Implementation
```css
/* Root: light mode */
:root {
  --background: #ffffff;
  --surface: #f8fafc;
  --surface-elevated: #ffffff;
  --border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --primary: #6366f1;
  --primary-hover: #4f46e5;
}

/* Dark mode override */
.dark {
  --background: #0f172a;
  --surface: #1e293b;
  --surface-elevated: #334155;
  --border: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --primary: #818cf8;
  --primary-hover: #6366f1;
}
```
**Toggle mechanism**: Zustand store (`useThemeStore`) toggles `.dark` class on `<html>`. Persisted to `localStorage`.

---

## 2.3 Typography

### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Scale
| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| Page Title (H1) | 30px / 1.875rem | 700 (Bold) | 1.2 | One per page, module name |
| Section Title (H2) | 24px / 1.5rem | 600 (Semibold) | 1.3 | Card headings, tab headers |
| Card Title (H3) | 18px / 1.125rem | 600 (Semibold) | 1.4 | Widget titles, panel labels |
| Subtitle (H4) | 16px / 1rem | 500 (Medium) | 1.5 | Sub-sections, form sections |
| Body | 14px / 0.875rem | 400 (Regular) | 1.5 | Default paragraph text |
| Small / Caption | 12px / 0.75rem | 400 (Regular) | 1.4 | Table cells, metadata |
| Micro | 10px / 0.625rem | 500 (Medium) | 1.2 | Badges, timestamps |
| KPI Number | 36px / 2.25rem | 700 (Bold) | 1.1 | Dashboard stat cards |

---

## 2.4 Spacing, Borders, Shadows

### Spacing Scale (4px base)
```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

### Border Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Badges, tags |
| `--radius-md` | 6px | Inputs, buttons |
| `--radius-lg` | 8px | Dropdowns, tooltips |
| `--radius-xl` | 12px | Cards, panels |
| `--radius-2xl` | 16px | Modals |
| `--radius-full` | 9999px | Dot badges, avatars |

### Shadow Scale
| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-none` | `none` | Dark mode cards |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Default card elevation |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` | Hover card, dropdown |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modal, popover |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.1)` | Command palette overlay |

### Z-Index Scale
| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | 0 | Default page content |
| `--z-dropdown` | 10 | Dropdowns, date pickers |
| `--z-sticky` | 20 | Sticky headers, sidebar |
| `--z-overlay` | 30 | Modal backdrop |
| `--z-modal` | 40 | Modals, dialogs |
| `--z-popover` | 50 | Tooltips, popovers |
| `--z-toast` | 60 | Toast notifications |
| `--z-command` | 70 | Command palette (Ctrl+K) |

---

## 2.5 Grid & Responsive Layout

### Grid System
- **Sidebar**: 280px (expanded) / 72px (collapsed)
- **Main Content**: `calc(100vw - sidebar)`
- **Content Max Width**: 1440px with `px-6` padding
- **Cards**: `gap-6` (24px) between cards
- **Form Fields**: `gap-4` (16px) between fields

### Responsive Breakpoints
| Name | Width | Behavior |
|------|-------|----------|
| Mobile | `< 768px` | Sidebar hidden, bottom nav, cards stack, tables → cards |
| Tablet | `768px - 1024px` | Sidebar collapsed (72px), 2-column grids |
| Desktop | `1024px - 1440px` | Sidebar expanded (280px), full layout |
| Wide | `> 1440px` | Centered content, max-width container |

---

## 2.6 Iconography

### Icon Library
- **Primary**: `lucide-react` (entire app uses Lucide icons, consistent stroke width `1.5px`)
- **Size Scale**: `16px` (inline), `20px` (default), `24px` (actions), `32px` (empty states)

### Icon Usage Rules
| Context | Size | Color |
|---------|------|-------|
| Sidebar nav items | 20px | `text-secondary`, active = `primary` |
| Button with label | 16px | Inherit button text color |
| Icon-only button | 18px | `text-secondary` |
| Table action icons | 16px | `text-muted`, hover = `text-primary` |
| Status indicators | 16px | Status color (green/yellow/red/blue) |
| Empty state illustrations | 48-64px | `text-muted` (use `strokeWidth={1}`) |

### Common Icon Mapping
```
Dashboard → LayoutDashboard     Assets → Package
Maintenance → Wrench            Inventory → Warehouse
Vendors → Building              Finance → DollarSign
HR → Users                      CRM → Target
Sales → ShoppingCart             Manufacturing → Factory
Quality → CheckCircle2           Projects → FolderKanban
Field Service → MapPin           Documents → FileText
Analytics → BarChart3            Notifications → Bell
Admin → Settings                 Profile → User
AI → Sparkles                    Search → Search
```

---

## 2.7 Component Patterns

### Buttons
| Variant | Usage | Example |
|---------|-------|---------|
| Primary (filled) | Main actions | [+ Create Asset], [Save] |
| Secondary (outline) | Secondary actions | [Cancel], [Export] |
| Ghost | Tertiary actions | [View All], inline links |
| Destructive (red) | Delete, remove | [Delete], [Remove] |
| Icon-only | Tight spaces | [✏], [🗑], [⋯] |

### Status Badges
- Dot badge (`rounded-full`): 8px colored circle + text
- Text badge (`rounded-md`): colored background with text
```
🟢 Active    🟡 Pending    🔴 Critical    🔵 In Progress    ⚪ Inactive
```

### Cards
| Property | Light | Dark |
|----------|-------|------|
| Background | `var(--surface)` | `var(--surface)` |
| Border | `1px solid var(--border)` | `1px solid var(--border)` |
| Radius | 12px (`rounded-xl`) | 12px |
| Shadow | `shadow-sm` | `none` |
| Padding | `24px` (p-6) | `24px` |
| Hover | `shadow-md` transition 200ms | `border-primary/20` glow |

### Tables (TanStack Table)
- Sticky header
- Alternating row colors (subtle)
- Hover highlight row
- Column resize handles
- Sort indicators (↕ ↑ ↓)
- Pagination footer
- Select all / bulk actions bar
- Empty state with icon + message

### Forms
- Labels above inputs (never floating)
- Asterisk (*) for required fields
- Inline validation (error message below field on blur)
- Smart defaults from user history
- Multi-step wizard for complex forms (3+ steps)

---

## 2.8 State Patterns

### Loading States
| Context | Pattern |
|---------|---------|
| Page load | Full-page skeleton (shimmer cards matching layout) |
| Table loading | Skeleton rows (6 rows, shimmer animation) |
| Button submit | Spinner inside button + disabled state |
| Inline action | Small spinner (16px) replacing action icon |
| Infinite scroll | Spinner at bottom of list |

```
┌──────────────────────────────────────────────┐
│  ┌─ Skeleton ──────────────────────────────┐ │
│  │  ████████████░░░░░  │  ████░░░  │ ██░░  │ │
│  │  ████████░░░░░░░░░  │  ██████░  │ ██░░  │ │
│  │  ██████████████░░░  │  ████░░░  │ ██░░  │ │
│  └─────────────────────────────────────────┘ │
│  (Shimmer animation: pulse opacity 0.4→1)    │
└──────────────────────────────────────────────┘
```

### Empty States
| Context | Pattern |
|---------|---------|
| New module | Icon (48px muted) + "No [items] yet" + primary CTA button |
| Search no results | Search icon + "No results for '[query]'" + suggestion text |
| Filtered empty | Filter icon + "No matches" + [Clear Filters] ghost button |

### Error States
| Context | Pattern |
|---------|---------|
| Page error | Error boundary → card with icon, message, [Retry] button |
| Network error | Toast: "Connection lost. Retrying..." with retry countdown |
| Form field error | Red border + error message below field + `aria-invalid` |
| Auth expired | Toast: "Session expired" → redirect to login |
| Permission denied | Full page with lock icon + "Access Denied" + contact admin |

---

## 2.9 Toast/Notification Patterns

### Toast System (Shadcn Sonner → `sonner` npm package)
| Type | Icon | Color | Auto-dismiss |
|------|------|-------|-------------|
| Success | ✅ CheckCircle | Green | 3 seconds |
| Error | ❌ XCircle | Red | 5 seconds (sticky) |
| Warning | ⚠ AlertTriangle | Yellow | 4 seconds |
| Info | ℹ Info | Blue | 3 seconds |
| Undo | ↩ Undo | Primary | 5 seconds with [Undo] button |

### Position
- Desktop: bottom-right
- Mobile: bottom-center (full width)

### Undo Pattern (replaces "Are you sure?" dialogs)
```
┌──────────────────────────────────────────┐
│ ↩ Asset deleted                  [Undo]  │
│   ━━━━━━━━━━━▶────── 5s                 │
└──────────────────────────────────────────┘
```

---

## 2.10 Modal/Dialog Patterns

### Size Scale
| Size | Width | Usage |
|------|-------|-------|
| Small | 400px | Confirmations, single-field edits |
| Default | 520px | Forms, detail views |
| Large | 720px | Complex forms, previews |
| Full | 90vw × 90vh | File preview, report builder |

### Behavior
- Backdrop: `rgba(0,0,0,0.5)` overlay
- Animation: scale 0.95→1 + fade in (150ms)
- Close: ESC key, backdrop click, X button
- Focus trap: tab stays inside modal
- Scroll: body scroll locked while open
- Mobile: full-screen bottom sheet

### Structure
```
┌──────────────────────────────────────────┐
│ Modal Title                          [X] │
├──────────────────────────────────────────┤
│                                          │
│  Modal content (scrollable)              │
│                                          │
├──────────────────────────────────────────┤
│                    [Cancel]  [Confirm]   │
└──────────────────────────────────────────┘
```

---

## 2.11 Universal Page Layouts

### List Page Layout (ALL list pages follow this)
```
┌──────────────────────────────────────────────────────────────────┐
│  Module Title                       [+ New]  [Import] [Export]  │
├──────────────────────────────────────────────────────────────────┤
│  ┌─ Quick Stats Row ─────────────────────────────────────────┐  │
│  │  Total: 247  │  Active: 198  │  Critical: 12  │  ₹2.3M   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  🔍 Search...    [Filters ▾]  [Saved Views ▾]   📊│📋│📅│🗂   │
│                                         Table│Card│Calen│Kanban │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ ☐ │ Column 1 ↕ │ Column 2 ↕ │ Col 3 ↕ │ Status │ ⋯     │    │
│  │───│────────────│────────────│─────────│────────│───────│    │
│  │ ☐ │ Item 1     │ Value A    │ ₹12.4K  │ 🟢     │ ⋯ ✏ 🗑│    │
│  │ ☐ │ Item 2     │ Value B    │ ₹8.2K   │ 🟡     │ ⋯ ✏ 🗑│    │
│  └──────────────────────────────────────────────────────────┘    │
│  Selected: 2  [📤 Export] [🏷 Bulk Edit] [🗑 Delete]            │
│  ◀ 1 2 3 ... 12 ▶  Showing 1-20 of 247                        │
└──────────────────────────────────────────────────────────────────┘
```

**Components**: Quick stats row, search bar, filters, saved views toggle, 4-view switcher, TanStack Table, bulk actions bar, pagination.

### Detail / Entity Page Layout (ALL detail pages follow this)
```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to List    Breadcrumb: Module > List > Entity Name      │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  ENTITY HEADER CARD                                       │    │
│  │  ┌─────┐  Entity Name              Status: [🟢 Active]   │    │
│  │  │ Icon│  ID: COR-NYC-HVAC-042     ──────────────────── │    │
│  │  │ /QR │  Location: NYC Floor 2    Quick Stats Row       │    │
│  │  └─────┘  Assigned: John Smith     ₹12K │ 3 Tickets     │    │
│  │                                                           │    │
│  │  [✏ Edit] [📤 Transfer] [🖨 Print] [⋯ More Actions]     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Overview] [Timeline] [Finance] [Documents] [Related] [AI]    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  TAB CONTENT (scrollable)                                 │    │
│  │  All fields support inline editing                        │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  💡 CoreAI: "Suggested action based on context..."        │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

**Components**: Back button, breadcrumbs, entity header card (icon/QR, name, ID, status, quick stats), action buttons, tab navigation, tab content, AI suggestion bar.

### Form Page Layout (ALL create/edit pages follow this)
```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back    Create [Entity Name]                                  │
├──────────────────────────────────────────────────────────────────┤
│  Step: [1 Basic Info] → [2 Location] → [3 Financial] → [4 Review]│
│  ━━━━━━━━━━━▶──────────────────────────────── Progress: 25%     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Step Content                                             │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐       │    │
│  │  │ Field Label *       │  │ Field Label          │       │    │
│  │  │ [Input value   ]    │  │ [Input value     ]   │       │    │
│  │  │ Helper text         │  │                      │       │    │
│  │  └─────────────────────┘  └─────────────────────┘       │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                           [← Back] [Next Step →] │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2.12 Data Visualization Guidelines

### Chart Types by Use Case
| Data Type | Chart | Library |
|-----------|-------|---------|
| Trend over time | Line chart / Area chart | Recharts |
| Comparison | Bar chart (vertical/horizontal) | Recharts |
| Composition | Donut / Pie chart | Recharts |
| Relationship | Scatter plot | Recharts |
| Rank/Top N | Horizontal bar | Recharts |
| KPI | Number + trend arrow + sparkline | Custom |
| Progress | Circular gauge / Progress bar | Custom |
| Geographic | Heatmap on Leaflet map | Leaflet (🔲 Phase 6) |

### Chart Styling Rules
- Always include axis labels and legend
- Use `--font-sans` with size 12px for chart labels
- Use the sequential chart palette (Section 2.2)
- Add tooltips on hover with formatted values
- Include "No data" empty state for charts
- Responsive: hide legend on mobile, show on wide screens

---

## 2.13 Global Layout

### Desktop Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  🔍 Search or command... (Ctrl+K)       🔔 12  ☀/🌙  👤 John  │  ← Top Bar
├────────┬─────────────────────────────────────────────────────────┤
│Sidebar │  Breadcrumbs: Dashboard > Assets > COR-NYC-HVAC-042   │
│ ────── │                                                         │
│📊 Dash │  ┌─────────────────────────────────────────────────┐   │
│📦 Asset│  │                                                 │   │
│🔧 Maint│  │              PAGE CONTENT                       │   │
│📊 Inv. │  │                                                 │   │
│🏢 Vend.│  │                                                 │   │
│💰 Fin. │  │                                                 │   │
│👥 HR   │  │                                                 │   │
│📈 Anal.│  │                                                 │   │
│🔔 Notif│  │                                                 │   │
│⚙️ Admin│  │                                                 │   │
│        │  └─────────────────────────────────────────────────┘   │
│ ◀▶     │                                                         │
├────────┴─────────────────────────────────────────────────────────┤
│  ⌨ Ctrl+K: Search  Ctrl+N: New  Ctrl+S: Save  ?: Help          │  ← Status Bar
└──────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 768px)
```
┌─────────────────────────┐
│ ☰  CoreOps    🔔3  👤   │  ← Hamburger menu
├─────────────────────────┤
│  Breadcrumbs            │
│                         │
│  ┌───────────────────┐  │
│  │ PAGE CONTENT      │  │
│  │ (full width)      │  │
│  │ Tables → Cards    │  │
│  │ on mobile         │  │
│  └───────────────────┘  │
│                         │
├─────────────────────────┤
│ [🏠] [📷Scan] [➕] [🔔] │  ← Bottom Nav (min 44px touch)
└─────────────────────────┘
```

---

## 2.14 Global Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open Command Bar |
| `Ctrl+N` | Create New (context-aware) |
| `Ctrl+S` | Save current form |
| `Ctrl+/` | Show keyboard shortcuts help |
| `Ctrl+Shift+A` | New Asset |
| `Ctrl+Shift+T` | New Ticket |
| `Ctrl+Shift+P` | New Purchase Order |
| `Ctrl+Shift+N` | Open Notifications |
| `Esc` | Close modal/dialog/command bar |
| `?` | Show help overlay |
| `J/K` | Navigate list items (up/down) |
| `Enter` | Open selected item |

---

## 2.15 Animation Guidelines

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Page transition | Fade in + slide up | 200ms | ease-out |
| Modal open | Scale 0.95→1 + fade | 150ms | ease-out |
| Modal close | Scale 1→0.95 + fade | 100ms | ease-in |
| Toast notification | Slide in from right | 200ms | spring |
| Sidebar toggle | Width transition | 200ms | ease-in-out |
| Dropdown open | Scale Y 0→1 + fade | 150ms | ease-out |
| Button hover | Scale 1→1.02 | 100ms | ease-out |
| Skeleton loading | Pulse opacity 0.4→1 | 1500ms | linear (loop) |
| Kanban card drag | Scale 1→1.05 + shadow | 100ms | ease-out |
| Tab switching | Fade + slide | 150ms | ease-out |
| Card hover | shadow-sm → shadow-md | 200ms | ease-out |

Use `Framer Motion` for complex animations (page transitions, drag, layout). Use CSS `transition` for simple hover/focus states.

---

## 2.16 Content & Microcopy Guidelines

### Tone of Voice
- **Clear**: Use simple language, no jargon
- **Action-oriented**: "Create Asset" not "Asset Creation Form"
- **Reassuring**: "Changes saved" not "Operation completed successfully"
- **Concise**: "3 items selected" not "You have selected 3 items"

### Button Labels
| Do ✅ | Don't ❌ |
|------|---------|
| Save | Submit |
| Create Asset | Add New Asset Entry |
| Delete | Remove Item from System |
| Export CSV | Download |

### Error Messages
| Do ✅ | Don't ❌ |
|------|---------|
| "Email is already registered" | "Error 409: Duplicate key" |
| "Enter a valid email address" | "Invalid input" |
| "Connection lost. Retrying..." | "Network Error" |

### Empty State Copy
- **New module**: "No assets yet. Create your first asset to get started."
- **Search**: "No results for 'HVAC'. Try a different search term."
- **Filter**: "No items match these filters. [Clear Filters]"

---

## 2.17 Accessibility Standards (WCAG 2.1 AA)

| Requirement | Implementation |
|-------------|----------------|
| **Focus indicators** | `ring-2 ring-primary ring-offset-2` on all interactive elements |
| **Color contrast** | ≥ 4.5:1 for text, ≥ 3:1 for large text/icons |
| **Alt text** | All `<img>` elements have descriptive `alt` |
| **Keyboard nav** | All features accessible via keyboard |
| **Screen readers** | ARIA labels on icon-only buttons, semantic HTML |
| **Skip link** | "Skip to main content" link at top |
| **Error association** | `aria-describedby` linking errors to inputs |
| **Focus management** | Auto-focus first field in modals, restore on close |
| **Touch targets** | Minimum 44px × 44px for mobile |
| **Motion** | Respect `prefers-reduced-motion` media query |
| **Landmarks** | `<nav>`, `<main>`, `<aside>`, `<footer>` semantic tags |
| **Live regions** | `aria-live="polite"` for toast notifications |
| **Form labels** | Every `<input>` has an associated `<label>` |
