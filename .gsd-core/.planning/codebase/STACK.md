# Stack Research

**Domain:** Productivity / AI Dashboard Web App
**Researched:** 2026-03-30
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.6 | App framework | Standard for React-based SSR/SSG apps in 2026 |
| React | 19.2.3 | UI library | Core component rendering |
| TypeScript | 5.x | Type safety | Prevents runtime errors, better DX |
| Tailwind CSS | 4.x | Styling | Utility-first styling, standard for Next.js apps |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | 0.565.0 | Icons | Clean, consistent SVG icon set |
| Framer Motion | 12.36.0 | Animations | Complex UI interactions and transitions |
| TipTap | 3.20.0 | Rich Text | Markdown and rich text editing |
| React Dropzone / Images | 11.0.10 | Media handling | Image cropping and processing |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint | 9.x | Linting | Configured via `eslint.config.mjs` |

## Installation

```bash
# Core
npm install

# Dev dependencies
npm install -D
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js App Router | Pages Router | Legacy apps or simpler routing needs |
| Custom Hooks/Context | Zustand | When global state becomes too complex and causes re-renders |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Redux | Overkill for simple state, verbose | React Context or Zustand |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 19 | Next.js 16 | Ensure third-party libraries support React 19 |

## Sources

- `package.json` dependencies
- `tsconfig.json` configurations

---
*Stack research for: Ascend_project*
*Researched: 2026-03-30*
