// Example usage of assertResponse function
import { AxiosResponse } from 'axios'
import z from 'zod'
import { assertResponse } from './http.utils'

// Example 1: OCPI response validation
export function validateOcpiResponse(response: AxiosResponse) {
  const ocpiSchema = z.object({
    status_code: z.number(),
    data: z.any().optional(),
    status_message: z.string().optional(),
  })

  assertResponse(response, ocpiSchema)
  // Now TypeScript knows that response.data matches the schema
  console.log('Status code:', response.data.status_code)
}

// Example 2: API list response validation
export function validateListResponse(response: AxiosResponse) {
  const listSchema = z.object({
    data: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    ),
    total: z.number(),
  })

  assertResponse(response, listSchema)
  // Type-safe access to response data
  response.data.data.forEach((item) => {
    console.log(`Item: ${item.id} - ${item.name}`)
  })
}

// Example 3: Error handling
export function exampleWithErrorHandling(response: AxiosResponse) {
  const userSchema = z.object({
    id: z.string(),
    email: z.email(),
    name: z.string(),
  })

  try {
    assertResponse(response, userSchema)
    // Type-safe access
    console.log(`User: ${response.data.name} (${response.data.email})`)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid response format:', error.issues)
    }
    throw error
  }
}
