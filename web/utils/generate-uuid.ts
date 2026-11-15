import { v1 as uuidv1, v3 as uuidv3, v4 as uuidv4, v5 as uuidv5 } from "uuid"

/**
 * Generates a UUID.
 *
 * @returns {string} The generated UUID.
 */

export function generateUUIDv1(): string {
  return uuidv1()
}

export function generateUUIDv3(name: string, namespace: string): string {
  return uuidv3(name, namespace)
}

export function generateUUIDv4(): string {
  return uuidv4()
}

export function generateUUIDv5(name: string, namespace: string): string {
  return uuidv5(name, namespace)
}
