import { z } from 'zod'
import { Image } from './image'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

const BusinessDetailsSchema = z.object({
  name: z.string().min(1, 'Business name cannot be empty').trim(),
  website: z.string().url('Invalid website URL').optional(),
})

export class BusinessDetails {
  constructor(
    private readonly _name: string,
    private readonly _website?: string,
    private readonly _logo?: Image,
  ) {
    this.validate()
  }

  get name(): string {
    return this._name
  }

  get website(): string | undefined {
    return this._website
  }

  get logo(): Image | undefined {
    return this._logo
  }

  private validate(): void {
    const result = BusinessDetailsSchema.safeParse({
      name: this._name,
      website: this._website,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  equals(other: BusinessDetails): boolean {
    return (
      this._name === other._name &&
      this._website === other._website &&
      this._logo?.equals(other._logo) === true
    )
  }
}
