import { AxiosResponse } from 'axios'
import z from 'zod'

/**
 * Type-safe assertion for HTTP responses using Zod schema validation
 * @param result - Axios response object
 * @param schema - Zod schema to validate against
 * @throws {ZodError} - If validation fails
 */
export function assertResponse<Schema extends z.ZodType>(
  result: AxiosResponse,
  schema: Schema,
): asserts result is AxiosResponse<z.infer<Schema>> {
  schema.parse(result.data)
}
