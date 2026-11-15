import { cache } from "react"

export const getUser = cache(async (userId: string) => {
  console.log(`[Server] Fetching user ${userId}`)

  await new Promise((resolve) => setTimeout(resolve, 100))

  return {
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`,
  }
})

export const fetchPosts = cache(async () => {
  console.log("[Server] Fetching posts from API")

  const response = await fetch("https://jsonplaceholder.typicode.com/posts")
  if (!response.ok) {
    throw new Error("Failed to fetch posts")
  }

  return response.json()
})

export const computeExpensiveData = cache(async (input: number) => {
  console.log(`[Server] Computing expensive data for input: ${input}`)

  await new Promise((resolve) => setTimeout(resolve, 200))

  return {
    result: input * 2,
    timestamp: Date.now(),
  }
})
