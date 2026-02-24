import { NextRequest, NextResponse } from 'next/server';

/**
 * Example Route Handler
 *
 * Route Handlers allow you to create custom request handlers using Web APIs.
 * They replace API Routes from Pages Router.
 *
 * Key features:
 * - Support all HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
 * - Can be async
 * - Use Request and Response Web APIs
 * - Can use cookies, headers, and searchParams
 * - Support streaming responses
 * - Can specify runtime ('nodejs' or 'edge')
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

// Optional: Specify runtime (default is 'nodejs')
export const runtime = 'nodejs';

// Optional: Configure route segment options
export const dynamic = 'force-dynamic'; // or 'auto', 'force-static', 'error'

/**
 * GET /api/example
 * Example of a simple GET handler
 */
export async function GET(request: NextRequest) {
  // Access search params
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name') || 'World';

  // Access headers
  const userAgent = request.headers.get('user-agent');

  return NextResponse.json({
    message: `Hello, ${name}!`,
    userAgent,
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/example
 * Example of a POST handler with request body
 */
export async function POST(request: NextRequest) {
  try {
    // Parse JSON body
    const body = await request.json();

    // Validate input
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return response with custom status and headers
    return NextResponse.json(
      {
        success: true,
        data: {
          id: Math.random().toString(36).substring(7),
          name: body.name,
          createdAt: new Date().toISOString(),
        },
      },
      {
        status: 201,
        headers: {
          'X-Custom-Header': 'Custom-Value',
        },
      },
    );
  } catch (error) {
    console.error('POST /api/example error:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

/**
 * PUT /api/example
 * Example of a PUT handler
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    return NextResponse.json({
      success: true,
      message: 'Resource updated',
      data: body,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

/**
 * DELETE /api/example
 * Example of a DELETE handler
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: `Resource ${id} deleted`,
  });
}

/**
 * OPTIONS /api/example
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
