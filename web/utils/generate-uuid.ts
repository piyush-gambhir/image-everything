import { v1 as uuidv1, v3 as uuidv3, v4 as uuidv4, v5 as uuidv5 } from 'uuid';

/**
 * Generates a UUID.
 *
 * @returns {string} The generated UUID.
 */

// Function to generate UUID v1
export function generateUUIDv1(): string {
  return uuidv1();
}

// Function to generate UUID v3
export function generateUUIDv3(name: string, namespace: string): string {
  return uuidv3(name, namespace);
}

// Function to generate UUID v4
export function generateUUIDv4(): string {
  return uuidv4();
}

// Function to generate UUID v5
export function generateUUIDv5(name: string, namespace: string): string {
  return uuidv5(name, namespace);
}
