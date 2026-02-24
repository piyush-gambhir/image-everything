# Performance Patterns

Advanced patterns for optimizing React and Next.js applications based on Vercel React Best Practices.

## 1. `after()` for Non-Blocking Operations

The `after()` API allows you to schedule work to be executed after a response is sent, without blocking the user's request.

### Use Cases
- Analytics and logging
- Background data processing
- Cleanup tasks
- Non-critical API calls

### Example: Analytics Logging

```tsx
// app/actions.ts
'use server';

import { after } from 'next/server';

export async function handleFormSubmission(formData: FormData) {
  // Critical path - process form immediately
  const result = await saveToDatabase(formData);

  // Non-blocking - log after response is sent
  after(async () => {
    await logAnalytics({
      event: 'form_submission',
      userId: result.userId,
      timestamp: Date.now(),
    });
  });

  return { success: true, id: result.id };
}
```

### Example: Cleanup Tasks

```tsx
// app/api/upload/route.ts
import { after } from 'next/server';

export async function POST(request: Request) {
  const file = await processUpload(request);

  // Send response immediately
  const response = NextResponse.json({ fileId: file.id });

  // Clean up temp files after response
  after(async () => {
    await deleteTempFiles(file.tempPath);
  });

  return response;
}
```

### Benefits
- Faster response times
- Better user experience
- Cleaner separation of critical vs. non-critical work
- Automatic error handling (failures don't affect response)

---

## 2. `startTransition` for Non-Urgent Updates

React's `startTransition` marks updates as non-urgent, allowing React to keep the UI responsive during heavy updates.

### Use Cases
- Search filtering large lists
- Tab switching with heavy content
- Route transitions
- Non-urgent state updates that don't need immediate visual feedback

### Example: Search with Large List

```tsx
'use client';

import { useState, startTransition } from 'react';

export default function SearchableList({ items }: { items: string[] }) {
  const [query, setQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(items);

  const handleSearch = (value: string) => {
    // Update input immediately (urgent)
    setQuery(value);

    // Filter list in transition (non-urgent)
    startTransition(() => {
      const filtered = items.filter((item) =>
        item.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredItems(filtered);
    });
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
        className="border p-2"
      />
      <ul>
        {filteredItems.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Example: useTransition Hook for Loading States

```tsx
'use client';

import { useState, useTransition } from 'react';

export default function TabsWithLoading() {
  const [activeTab, setActiveTab] = useState('tab1');
  const [isPending, startTransition] = useTransition();

  const switchTab = (tab: string) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  return (
    <div>
      <div className="flex gap-2">
        <button onClick={() => switchTab('tab1')}>Tab 1</button>
        <button onClick={() => switchTab('tab2')}>Tab 2</button>
        <button onClick={() => switchTab('tab3')}>Tab 3</button>
      </div>

      {isPending && <div>Loading...</div>}

      <div className="mt-4">
        {activeTab === 'tab1' && <HeavyComponent1 />}
        {activeTab === 'tab2' && <HeavyComponent2 />}
        {activeTab === 'tab3' && <HeavyComponent3 />}
      </div>
    </div>
  );
}
```

### Benefits
- Keeps input responsive during heavy updates
- Prevents UI freezing
- Better perceived performance
- Automatic loading state with `useTransition`

---

## 3. Combining Both Patterns

```tsx
'use client';

import { useState, useTransition } from 'react';
import { trackUserAction } from '@/app/actions';

export default function OptimizedSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = async (value: string) => {
    // Update input immediately
    setQuery(value);

    // Heavy search in transition
    startTransition(async () => {
      const newResults = await searchDatabase(value);
      setResults(newResults);

      // Track analytics without blocking (runs after render)
      await trackUserAction({
        type: 'search',
        query: value,
        resultCount: newResults.length,
      });
    });
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />
      {isPending && <div className="spinner" />}
      <Results items={results} />
    </div>
  );
}
```

---

## 4. Performance Checklist

### Server-Side
- ✅ Use `after()` for analytics, logging, and cleanup
- ✅ Use `React.cache()` for request deduplication
- ✅ Implement proper error boundaries
- ✅ Minimize data sent to client components

### Client-Side
- ✅ Use `startTransition` for non-urgent updates
- ✅ Use `useDeferredValue` for derived values
- ✅ Implement proper loading states with `useTransition`
- ✅ Avoid unnecessary re-renders with `memo`, `useMemo`, `useCallback`

### Bundle Optimization
- ✅ Use dynamic imports for heavy components
- ✅ Avoid barrel exports (import directly)
- ✅ Defer third-party scripts
- ✅ Use `next/image` for image optimization

---

## 5. Common Pitfalls

### ❌ Don't Use Transitions for Everything

```tsx
// Bad - input will feel laggy
const handleChange = (value: string) => {
  startTransition(() => {
    setValue(value); // Input should update immediately!
  });
};

// Good - only heavy work in transition
const handleChange = (value: string) => {
  setValue(value); // Immediate
  startTransition(() => {
    updateHeavyComputation(value); // Deferred
  });
};
```

### ❌ Don't Put Critical Work in after()

```tsx
// Bad - user won't see the result
after(async () => {
  await chargeUserPayment(); // Critical!
});

// Good - do critical work first
const paymentResult = await chargeUserPayment();
after(async () => {
  await sendReceiptEmail(paymentResult); // Non-critical
});
```

---

## References

- [Next.js after() API](https://nextjs.org/docs/app/api-reference/functions/after)
- [React useTransition](https://react.dev/reference/react/useTransition)
- [Vercel React Best Practices](https://vercel.com/blog/how-react-18-improves-application-performance)
