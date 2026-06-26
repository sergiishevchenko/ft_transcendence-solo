# Tailwind CSS

## Overview

Tailwind CSS is the utility-first CSS framework used for all UI styling. It is integrated via PostCSS as part of the Vite build pipeline. No custom component library or CSS-in-JS is used — all styling happens through Tailwind utility classes directly in HTML/TypeScript template strings.

## Setup

### Dependencies

In `frontend/package.json` (devDependencies):

```json
{
  "tailwindcss": "^3.3.6",
  "postcss": "^8.4.32",
  "autoprefixer": "^10.4.16"
}
```

### Configuration Files

**`frontend/tailwind.config.js`**:

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

The `content` array tells Tailwind which files to scan for class usage. Unused classes are purged from the production build.

**`frontend/postcss.config.js`**:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

PostCSS runs Tailwind's compiler and then Autoprefixer for vendor prefixes.

### Entry CSS

**`frontend/src/index.css`**:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  /* ... */
}
```

The three `@tailwind` directives inject Tailwind's base reset, component classes, and utility classes. Custom global styles follow below.

### Import Chain

```
main.ts → import './index.css'
  → Vite detects CSS import
  → PostCSS processes it (tailwindcss + autoprefixer)
  → Styles injected into page
```

In development, Vite handles hot module replacement for CSS changes.

## How It Works in This Project

Since the project uses vanilla TypeScript (no React/Vue), all DOM is built with template strings. Tailwind classes are applied directly in `innerHTML`:

```typescript
div.innerHTML = `
  <div class="bg-gray-800 rounded-lg p-6 mb-6">
    <h2 class="text-xl font-bold mb-4">Title</h2>
    <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
      Click me
    </button>
  </div>
`
```

This is the standard way to use Tailwind without a framework — classes are strings, no JSX required.

## Design System

### Color Palette

The project uses Tailwind's default gray-900 dark theme:

| Element | Classes | Visual |
|---------|---------|--------|
| Page background | `bg-gray-900` | Near-black |
| Card/panel | `bg-gray-800` | Dark gray |
| Input fields | `bg-gray-700` | Medium gray |
| Hover states | `bg-gray-700` / `hover:bg-gray-600` | Lighter gray |
| Text primary | `text-white` | White |
| Text secondary | `text-gray-400` | Muted gray |
| Text tertiary | `text-gray-500` | Faint gray |

### Accent Colors

| Purpose | Color | Classes |
|---------|-------|---------|
| Primary action | Blue | `bg-blue-600 hover:bg-blue-700` |
| Success/start | Green | `bg-green-600 hover:bg-green-700` |
| Danger/delete | Red | `bg-red-600 hover:bg-red-700` |
| Warning/AI | Yellow | `bg-yellow-600 hover:bg-yellow-700` |
| Special/4-player | Purple | `border-purple-500` |
| Win stats | Green | `text-green-400` |
| Loss stats | Red | `text-red-400` |
| Rate stats | Blue | `text-blue-400` |

### Typography

| Element | Classes |
|---------|---------|
| Page title | `text-3xl font-bold` or `text-4xl font-bold` |
| Section title | `text-xl font-bold` |
| Body text | Default (no extra classes) |
| Small/hint | `text-sm text-gray-400` |
| Extra small | `text-xs text-gray-500` |
| Score display | `text-3xl font-bold` |

### Spacing

Standard Tailwind spacing scale. Common patterns:

| Pattern | Classes |
|---------|---------|
| Page padding | `px-4 sm:px-6 lg:px-8 py-8` |
| Page max width | `max-w-7xl mx-auto` |
| Card padding | `p-6` |
| Card margin | `mb-6` |
| Element gap | `gap-2`, `gap-4`, `gap-6` |
| Button padding | `px-4 py-2` or `px-6 py-2` |

### Responsive Design

Tailwind mobile-first breakpoints:

| Prefix | Min width | Usage |
|--------|-----------|-------|
| (none) | 0px | Mobile default |
| `sm:` | 640px | Small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Desktop |

Example: `class="px-4 sm:px-6 lg:px-8"` — tighter padding on mobile, wider on desktop.

Grid layouts: `class="grid grid-cols-1 md:grid-cols-2 gap-6"` — single column on mobile, two columns on tablet+.

## UI Components

### Navigation Bar

```
bg-gray-800 border-b border-gray-700
  max-w-7xl mx-auto px-4 h-16
    flex items-center justify-between
```

Active link: `bg-gray-700 text-white`
Inactive link: `text-gray-300 hover:bg-gray-700 hover:text-white`

### Cards/Panels

```
bg-gray-800 rounded-lg p-6 mb-6
```

With hover effect (game mode cards):
```
bg-gray-800 rounded-lg p-6 hover:bg-gray-750 cursor-pointer
  transition border-2 border-transparent hover:border-blue-500
```

### Buttons

Primary: `px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white`
Success: `px-6 py-2 bg-green-600 hover:bg-green-700 rounded`
Danger: `px-6 py-2 bg-red-600 hover:bg-red-700 rounded`
Disabled: add `opacity-50 cursor-not-allowed`

### Form Inputs

```
w-full px-4 py-2 bg-gray-700 text-white rounded
```

### Avatar Circle

```
w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden
```

Small: `w-10 h-10 rounded-full bg-gray-600`

### Online Status Dot

```
absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800
```

Online: add `bg-green-500`
Offline: add `bg-gray-500`

### Chat Bubbles

Own message: `max-w-xs px-4 py-2 rounded-lg bg-blue-600` (right-aligned via `flex justify-end`)
Other's message: `max-w-xs px-4 py-2 rounded-lg bg-gray-700` (left-aligned)

### Stats Grid

```
grid grid-cols-3 gap-4
  text-center
    text-3xl font-bold text-green-400  ← value
    text-gray-400                      ← label
```

## Build Process

### Development

Vite serves CSS with HMR. Tailwind JIT compiler generates only used classes on the fly. Changes to any `.ts` file trigger Tailwind to rescan and regenerate.

### Production

```bash
npm run build  # tsc && vite build
```

Vite + PostCSS + Tailwind:
1. Tailwind scans all files in `content` paths
2. Generates only CSS for used utility classes
3. Autoprefixer adds vendor prefixes
4. Vite minifies the output

Result: a single small CSS file with only the classes actually used.

## Why Tailwind (Not Custom CSS)

| Approach | Pros | Cons |
|----------|------|------|
| Custom CSS | Full control | Large files, naming conflicts, maintenance |
| CSS Modules | Scoped styles | Build complexity, verbose |
| Tailwind | Fast development, consistent design, small output | Long class strings |

For a project without a component framework (no React/Vue), Tailwind is practical because:
- Classes live in template strings alongside HTML
- No need for separate `.css` files per component
- Design consistency is enforced by the utility system
- Production CSS is automatically optimized

## Related Documentation

- [Frontend](./frontend.md) — SPA architecture and pages
- [Architecture](./architecture.md) — build pipeline overview
