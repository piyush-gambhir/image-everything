# Parallel & Intercepting Routes

Parallel and intercepting routes are advanced Next.js patterns for building complex UI like modals, split views, and conditional layouts.

## Parallel Routes

Parallel routes allow you to render multiple pages in the same layout simultaneously. They're defined using `@folder` convention.

### Use Cases
- Dashboard with multiple sections
- Split view layouts
- Conditional UI based on user state
- A/B testing different layouts

### File Structure

```
app/
├── layout.tsx
├── @sidebar/
│   ├── page.tsx
│   └── loading.tsx
├── @main/
│   ├── page.tsx
│   └── loading.tsx
└── page.tsx
```

### Layout Implementation

```tsx
// app/layout.tsx
export default function Layout({
  children,
  sidebar,
  main,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  main: React.ReactNode;
}) {
  return (
    <div>
      <aside>{sidebar}</aside>
      <main>{main}</main>
      <div>{children}</div>
    </div>
  );
}
```

### Default Slots

Create `default.tsx` to handle unmatched routes:

```tsx
// app/@sidebar/default.tsx
export default function Default() {
  return null; // or a fallback UI
}
```

---

## Intercepting Routes

Intercepting routes allow you to "intercept" navigation and render different content, commonly used for modals.

### Route Conventions

- `(.)` - Match segments at the same level
- `(..)` - Match segments one level up
- `(..)(..)` - Match segments two levels up
- `(...)` - Match from root

### Modal Pattern Example

A common pattern: Show a photo in a modal when navigating from the gallery, but show a full page when accessing directly.

#### File Structure

```
app/
├── layout.tsx
├── @modal/
│   ├── (.)photos/
│   │   └── [id]/
│   │       └── page.tsx  # Modal version
│   └── default.tsx
└── photos/
    └── [id]/
        └── page.tsx      # Full page version
```

#### Root Layout with Modal Slot

```tsx
// app/layout.tsx
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}
```

#### Modal Default (Important!)

```tsx
// app/@modal/default.tsx
export default function Default() {
  return null; // Don't render modal by default
}
```

#### Intercepted Modal Page

```tsx
// app/@modal/(.)photos/[id]/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function PhotoModal({ params }: { params: { id: string } }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 bg-black/80" onClick={() => router.back()}>
      <div className="flex h-full items-center justify-center p-8">
        <div className="relative max-w-3xl rounded-lg bg-white p-6">
          <button
            onClick={() => router.back()}
            className="absolute right-4 top-4 text-2xl"
          >
            ×
          </button>
          <img
            src={`/photos/${params.id}.jpg`}
            alt="Photo"
            className="max-h-[80vh]"
          />
        </div>
      </div>
    </div>
  );
}
```

#### Full Page Version

```tsx
// app/photos/[id]/page.tsx
export default function PhotoPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-4 text-2xl font-bold">Photo {params.id}</h1>
      <img src={`/photos/${params.id}.jpg`} alt="Photo" />
    </div>
  );
}
```

#### Gallery with Links

```tsx
// app/gallery/page.tsx
import Link from 'next/link';

export default function Gallery() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((id) => (
        <Link key={id} href={`/photos/${id}`}>
          <img src={`/photos/${id}.jpg`} alt={`Photo ${id}`} />
        </Link>
      ))}
    </div>
  );
}
```

---

## Important: Closing Modals

Use `router.back()` to close modals, not `router.push()`:

```tsx
// ✓ Correct - preserves history
<button onClick={() => router.back()}>Close</button>

// ✗ Wrong - breaks back button behavior
<button onClick={() => router.push('/')}>Close</button>
```

---

## Parallel Routes + Intercepting Routes

Combine both for advanced patterns:

```
app/
├── layout.tsx
├── @modal/
│   ├── (.)settings/
│   │   └── page.tsx    # Intercept as modal
│   └── default.tsx
├── @sidebar/
│   └── page.tsx        # Always visible sidebar
└── settings/
    └── page.tsx        # Full page fallback
```

---

## Tips

1. **Always create `default.tsx`** for parallel route slots
2. **Use `router.back()`** to close modals, not `router.push()`
3. **Client Components required** for intercepting routes (need `useRouter`)
4. **Test direct access** - ensure full page version works
5. **Consider loading states** - add `loading.tsx` for each slot

---

## References

- [Next.js Parallel Routes](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes)
- [Next.js Intercepting Routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes)
