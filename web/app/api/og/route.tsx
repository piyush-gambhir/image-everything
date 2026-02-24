import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

/**
 * Example: OG Image Generation
 *
 * Generate dynamic Open Graph images using next/og.
 * These images are used for social media previews (Twitter, Facebook, etc.)
 *
 * Features:
 * - Uses React/JSX syntax (limited subset)
 * - Supports Tailwind CSS classes
 * - Runs on Edge Runtime for fast generation
 * - Automatically cached
 *
 * Usage:
 * <meta property="og:image" content="/api/og?title=My+Page" />
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/image-response
 */

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const title = searchParams.get('title') || 'Next.js Template';
    const description = searchParams.get('description') || 'Modern Next.js starter template';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            padding: '80px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Top section with title and description */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <h1
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: '#fff',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: '32px',
                color: '#999',
                margin: 0,
                maxWidth: '80%',
              }}
            >
              {description}
            </p>
          </div>

          {/* Bottom section with branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#fff',
                borderRadius: '12px',
                display: 'flex',
              }}
            />
            <span
              style={{
                fontSize: '24px',
                color: '#fff',
                fontWeight: '600',
              }}
            >
              your-domain.com
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error('OG Image generation error:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}

/**
 * Alternative example with custom fonts:
 *
 * To use custom fonts, you need to fetch the font file:
 *
 * ```tsx
 * const fontData = await fetch(
 *   new URL('./fonts/Inter-Bold.ttf', import.meta.url)
 * ).then((res) => res.arrayBuffer());
 *
 * return new ImageResponse(
 *   <div>...</div>,
 *   {
 *     width: 1200,
 *     height: 630,
 *     fonts: [
 *       {
 *         name: 'Inter',
 *         data: fontData,
 *         style: 'normal',
 *         weight: 700,
 *       },
 *     ],
 *   },
 * );
 * ```
 */

/**
 * Example integration with dynamic routes:
 *
 * ```tsx
 * // app/blog/[slug]/opengraph-image.tsx
 * import { ImageResponse } from 'next/og';
 *
 * export default async function Image({
 *   params,
 * }: {
 *   params: { slug: string };
 * }) {
 *   const post = await getPost(params.slug);
 *
 *   return new ImageResponse(
 *     <div>{post.title}</div>,
 *     { width: 1200, height: 630 }
 *   );
 * }
 * ```
 */
