# Bundle Optimization Guide

Comprehensive guide to reducing bundle size and improving load times in your Next.js application.

## Critical: Avoid Barrel Exports

**Problem:** Barrel exports (`export * from './module'`) prevent tree-shaking and bloat your bundle.

### Bad: Barrel Export in index.ts

```typescript
// hooks/index.ts ❌
export * from './use-click-outside';
export * from './use-copy-to-clipboard';
export * from './use-debounce';
// ... 20 more exports
```

```typescript
// Usage that imports ONE hook but bundles ALL hooks
import { useFetch } from '@/hooks'; // ❌ Imports everything!
```

### Good: Direct Imports

```typescript
// Import directly from the source file
import { useFetch } from '@/hooks/use-fetch'; // ✅ Only imports useFetch!
```

### Solution for This Template

The template uses barrel exports for convenience, but you have two options:

**Option 1: Direct Imports (Recommended for production)**
```typescript
import { useFetch } from '@/hooks/use-fetch';
import { useLocalStorage } from '@/hooks/use-local-storage';
```

**Option 2: Named Barrel Exports**
```typescript
// hooks/index.ts
export { useFetch } from './use-fetch';
export { useLocalStorage } from './use-local-storage';
// Explicit exports enable tree-shaking (better than export *)
```

---

## Next.js Bundle Optimization Config

The template includes optimizations in `next.config.ts`:

```typescript
experimental: {
  optimizePackageImports: ['@/hooks', '@/utils'],
}
```

This automatically optimizes imports from these packages, but **direct imports are still faster**.

---

## Dynamic Imports for Code Splitting

Use `next/dynamic` to lazy-load heavy components:

```typescript
import dynamic from 'next/dynamic';

// Load component only when needed
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false, // Skip server-side rendering if it uses browser APIs
});

export default function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && <HeavyChart />}
    </div>
  );
}
```

### When to Use Dynamic Imports

- ✅ Modal dialogs and popups
- ✅ Charts and data visualizations
- ✅ Rich text editors
- ✅ Components behind tabs or accordions
- ✅ Features behind feature flags
- ❌ Above-the-fold content
- ❌ Critical UI components

---

## Defer Third-Party Scripts

Load analytics and tracking scripts **after** hydration:

```typescript
// app/layout.tsx
'use client';

import { useEffect } from 'react';

export default function Layout({ children }) {
  useEffect(() => {
    // Load after hydration
    const script = document.createElement('script');
    script.src = 'https://analytics.example.com/script.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return <>{children}</>;
}
```

Or use `next/script` with `afterInteractive`:

```typescript
import Script from 'next/script';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Script
        src="https://analytics.example.com/script.js"
        strategy="afterInteractive"
      />
    </>
  );
}
```

---

## Conditional Module Loading

Load modules only when needed:

```typescript
// Bad: Always imported
import heavyLibrary from 'heavy-library'; // ❌

export function MyComponent({ enabled }) {
  if (enabled) {
    return <div>{heavyLibrary.doSomething()}</div>;
  }
  return null;
}
```

```typescript
// Good: Imported only when needed
export function MyComponent({ enabled }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (enabled) {
      import('heavy-library').then((lib) => {
        setResult(lib.default.doSomething());
      });
    }
  }, [enabled]);

  if (!enabled) return null;
  return <div>{result}</div>;
}
```

---

## Analyze Your Bundle

Run bundle analyzer to identify large dependencies:

```bash
pnpm analyze
```

This opens a visual breakdown of your bundle. Look for:
- Unexpectedly large packages
- Duplicate dependencies
- Unused code

---

## Image Optimization

Always use `next/image`:

```typescript
import Image from 'next/image';

// ✅ Good - Optimized, lazy-loaded, responsive
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority={isAboveFold}
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// ❌ Bad - No optimization
<img src="/hero.jpg" alt="Hero" />
```

---

## Font Optimization

Use `next/font` for automatic font optimization:

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function Layout({ children }) {
  return (
    <html className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

---

## Remove Unused Dependencies

Regularly audit your dependencies:

```bash
pnpm list --depth=0
```

Remove unused packages:

```bash
pnpm remove unused-package
```

---

## Server vs. Client Components

**Use Server Components by default** - they don't add to the client bundle:

```typescript
// Server Component (default) ✅
export default async function Page() {
  const data = await fetch('...');
  return <div>{data}</div>;
}
```

Only use Client Components when needed:

```typescript
// Client Component ⚠️
'use client';

export default function InteractiveWidget() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

---

## Checklist

- [ ] Use direct imports instead of barrel exports
- [ ] Enable `optimizePackageImports` in next.config.ts
- [ ] Dynamic import heavy components
- [ ] Defer third-party scripts
- [ ] Use `next/image` for all images
- [ ] Use `next/font` for fonts
- [ ] Analyze bundle with `pnpm analyze`
- [ ] Remove unused dependencies
- [ ] Prefer Server Components over Client Components
- [ ] Use React.lazy() for conditional features

---

## Measuring Impact

Use Lighthouse to measure improvements:

```bash
pnpm build
pnpm start
# Open DevTools > Lighthouse > Run audit
```

Target metrics:
- **First Contentful Paint (FCP):** < 1.8s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Total Blocking Time (TBT):** < 200ms
- **Cumulative Layout Shift (CLS):** < 0.1

---

## References

- [Next.js Bundle Analyzer](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer)
- [Vercel React Best Practices - Bundle Optimization](https://vercel.com/blog/how-react-18-improves-application-performance)
- [Next.js Dynamic Imports](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
