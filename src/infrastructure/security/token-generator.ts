import { Injectable } from '@nestjs/common'
import {
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto'

/**
 * TokenGenerator – generates and encodes tokens for OCPI Credentials.
 *
 * generate()        -> Base64URL (without padding) for application display/logic
 * toAuthHeader(t)   -> "Token <base64(t)>" according to OCPI (HTTP header)
 * fromAuthHeader(h) -> decodes Base64 from header to raw token (string)
 * hash/verify       -> secure storage and token verification
 */
@Injectable()
export class TokenGenerator {
  readonly #hmacSecret?: string
  static readonly BYTES = 32 // 256-bit

  constructor() {
    this.#hmacSecret = process.env.TOKEN_HMAC_SECRET || undefined
  }

  /**
   * Generates a new token in Base64URL format (without '=' and +,/ characters)
   */
  generate(): string {
    const buf = randomBytes(TokenGenerator.BYTES) // CSPRNG
    return TokenGenerator.toBase64Url(buf)
  }

  /**
   * Builds Authorization header value for OCPI:
   * "Token " + Base64(ASCII(token))
   * OCPI spec requires the VALUE in the header to be Base64. Token can be ASCII.
   */
  toAuthorizationHeader(token: string): string {
    const base64 = Buffer.from(token, 'utf8').toString('base64') // klasyczny Base64
    return `Token ${base64}`
  }

  /**
   * Reads token from "Authorization: Token <base64-ascii>" header
   * Returns original ASCII token (e.g., our Base64URL)
   */
  fromAuthorizationHeader(header: string | undefined): string | null {
    if (!header) return null
    const [scheme, value] = header.split(/\s+/, 2)
    if (!scheme || scheme.toLowerCase() !== 'token' || !value) return null
    try {
      return Buffer.from(value, 'base64').toString('utf8')
    } catch {
      return null
    }
  }

  /**
   * Returns token hash for database storage (hex).
   * Preferred HMAC-SHA-256 with secret; fallback to SHA-256 if no secret.
   */
  hash(token: string): string {
    if (this.#hmacSecret) {
      return createHmac('sha256', this.#hmacSecret)
        .update(token, 'utf8')
        .digest('hex')
    }
    return createHash('sha256').update(token, 'utf8').digest('hex')
  }

  /**
   * Constant-time verification of given token against stored hash.
   */
  verify(token: string, storedHashHex: string): boolean {
    const given = Buffer.from(this.hash(token), 'hex')
    const stored = Buffer.from(storedHashHex, 'hex')
    if (given.length !== stored.length) return false
    return timingSafeEqual(given, stored)
  }

  /** Base64URL without padding '=' */
  private static toBase64Url(buf: Buffer): string {
    return buf
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
  }
}
