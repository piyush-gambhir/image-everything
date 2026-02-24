'use server';

/**
 * Example Server Actions
 *
 * Server Actions are functions that run on the server and can be called from
 * Client Components. They're useful for mutations, form submissions, and
 * server-side operations.
 *
 * Key points:
 * - Must be marked with 'use server' directive
 * - Can only accept serializable arguments (no functions, classes, etc.)
 * - Automatically handle CSRF protection
 * - Should validate authentication like API routes
 * - Can use cookies(), headers(), and other server-only APIs
 *
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
 */

import { revalidatePath } from 'next/cache';

/**
 * Example: Simple server action that processes form data
 */
export async function submitForm(formData: FormData) {
  // Extract form data
  const name = formData.get('name')?.toString();
  const email = formData.get('email')?.toString();

  // Validate inputs
  if (!name || !email) {
    return { success: false, error: 'Name and email are required' };
  }

  // Simulate async operation (e.g., database write, API call)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Revalidate cache if needed
  revalidatePath('/');

  return { success: true, data: { name, email } };
}

/**
 * Example: Server action with authentication check
 */
export async function authenticatedAction(data: { message: string }) {
  // In a real app, check authentication:
  // const session = await getSession();
  // if (!session) {
  //   throw new Error('Unauthorized');
  // }

  // Validate input
  if (!data.message || data.message.length === 0) {
    return { success: false, error: 'Message is required' };
  }

  // Perform server-side operation
  console.log('Processing message:', data.message);

  return { success: true, message: 'Action completed successfully' };
}

/**
 * Example: Server action with try-catch error handling
 */
export async function safeServerAction(userId: string) {
  try {
    // Simulate database operation
    await new Promise((resolve) => setTimeout(resolve, 500));

    return { success: true, userId };
  } catch (error) {
    console.error('Server action error:', error);
    return { success: false, error: 'An error occurred while processing your request' };
  }
}
