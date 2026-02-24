# Runtime Selection Guide

Next.js supports two runtimes for server-side code: **Node.js** and **Edge**. This guide helps you choose the right runtime for your use case.

## Default: Node.js Runtime

The Node.js runtime is the **default** and **recommended** for most applications. It provides:

- Full Node.js API access
- All npm packages work
- No size restrictions
- Database connections
- File system access
- Longer execution times

## When to Use Edge Runtime

The Edge runtime runs on Vercel's Edge Network (or similar CDNs) and provides:

- **Global distribution** - Runs closer to users
- **Faster cold starts** - Instant response times
- **Lower latency** - Reduced round-trip times

**Use Edge runtime for:**
- Proxy (middleware) - Always runs on Edge
- Simple API routes with minimal dependencies
- A/B testing and redirects
- Geolocation-based responses
- Authentication checks
- Header/cookie manipulation

**Don't use Edge runtime for:**
- Database operations (unless using Edge-compatible DBs)
- Heavy computations
- Large npm packages
- File system operations
- Native Node.js APIs

## How to Specify Runtime

### For Route Handlers (app/api/)

```typescript
// app/api/hello/route.ts
export const runtime = 'edge'; // or 'nodejs' (default)

export async function GET(request: Request) {
  return Response.json({ message: 'Hello from Edge!' });
}
```

### For Pages

```typescript
// app/page.tsx
export const runtime = 'edge'; // or 'nodejs' (default)

export default function Page() {
  return <div>Edge-rendered page</div>;
}
```

### For Proxy/Middleware (always Edge)

Proxy (called middleware in Next.js <16) **always runs on Edge runtime** - you cannot change this.

```typescript
// proxy.ts (Next.js 16+) or middleware.ts (older versions)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // This automatically runs on Edge
  return NextResponse.next();
}
```

## Edge Runtime Limitations

The Edge runtime has some restrictions:

### Not Available:
- Native Node.js modules (`fs`, `path`, `child_process`, etc.)
- Many npm packages that depend on Node.js APIs
- Long-running operations (max 30 seconds on Vercel)
- Large bundle sizes (limited to 1-4 MB depending on platform)

### Available:
- Web APIs (`fetch`, `Response`, `Request`, `URL`, `crypto`)
- Edge-compatible npm packages
- Environment variables
- Cookies and headers

## Example: API Route Selection

```typescript
// app/api/user/route.ts - Node.js (database access)
export const runtime = 'nodejs'; // default, can be omitted

import { db } from '@/lib/db';

export async function GET() {
  const users = await db.user.findMany();
  return Response.json(users);
}
```

```typescript
// app/api/hello/route.ts - Edge (simple response)
export const runtime = 'edge';

export async function GET(request: Request) {
  const geo = request.headers.get('x-vercel-ip-country') || 'Unknown';
  return Response.json({ message: `Hello from ${geo}!` });
}
```

## Testing Edge Compatibility

To test if your code works on Edge:

1. Set `runtime = 'edge'` in your route/page
2. Run `pnpm dev` and test locally
3. Check for errors about unsupported APIs
4. Replace Node.js-specific code with Edge-compatible alternatives

## Edge-Compatible Packages

Common packages that work on Edge:
- `zod` - Schema validation
- `jose` - JWT signing/verification
- `@vercel/edge-config` - Edge config
- `@upstash/redis` - Edge-compatible Redis

Packages that **don't** work on Edge:
- `prisma` (full version)
- `bcrypt` (use `bcryptjs` instead)
- `jsonwebtoken` (use `jose` instead)
- Most database clients (unless Edge-specific)

## Recommendations

1. **Start with Node.js runtime** - It's the most flexible
2. **Use Edge for middleware** - It's automatically Edge
3. **Use Edge for simple API routes** - Auth checks, redirects, etc.
4. **Avoid Edge for complex logic** - Database queries, heavy processing
5. **Test thoroughly** - Edge has different behavior than Node.js

## References

- [Next.js Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
- [Edge Runtime APIs](https://edge-runtime.vercel.app/)
