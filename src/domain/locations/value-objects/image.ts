import { z } from 'zod'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

export type ImageCategory =
  | 'CHARGER'
  | 'ENTRANCE'
  | 'LOCATION'
  | 'NETWORK'
  | 'OPERATOR'
  | 'OTHER'
  | 'OWNER'

const ImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  type: z.string().min(1, 'Image type cannot be empty').trim(),
  thumbnail: z.string().url('Invalid thumbnail URL').optional(),
  width: z.number().positive('Image width must be positive').optional(),
  height: z.number().positive('Image height must be positive').optional(),
})

export class Image {
  constructor(
    private readonly _url: string,
    private readonly _category: ImageCategory,
    private readonly _type: string,
    private readonly _thumbnail?: string,
    private readonly _width?: number,
    private readonly _height?: number,
  ) {
    this.validate()
  }

  get url(): string {
    return this._url
  }

  get category(): ImageCategory {
    return this._category
  }

  get type(): string {
    return this._type
  }

  get thumbnail(): string | undefined {
    return this._thumbnail
  }

  get width(): number | undefined {
    return this._width
  }

  get height(): number | undefined {
    return this._height
  }

  private validate(): void {
    const result = ImageSchema.safeParse({
      url: this._url,
      type: this._type,
      thumbnail: this._thumbnail,
      width: this._width,
      height: this._height,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  equals(other?: Image): boolean {
    if (!other) {
      return false
    }
    return (
      this._url === other._url &&
      this._category === other._category &&
      this._type === other._type &&
      this._thumbnail === other._thumbnail &&
      this._width === other._width &&
      this._height === other._height
    )
  }
}
