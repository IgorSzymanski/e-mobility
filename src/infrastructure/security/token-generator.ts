// src/infrastructure/security/token-generator.ts
import { Injectable } from '@nestjs/common'
import {
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto'

/**
 * TokenGenerator – generuje i koduje tokeny do OCPI Credentials.
 *
 * generate()        -> Base64URL (bez paddingu) do wyświetlania/logiki aplikacji
 * toAuthHeader(t)   -> "Token <base64(t)>" zgodnie z OCPI (nagłówek HTTP)
 * fromAuthHeader(h) -> dekoduje Base64 z nagłówka do surowego tokenu (string)
 * hash/verify       -> bezpieczne przechowywanie i weryfikacja tokenu
 */
@Injectable()
export class TokenGenerator {
  // opcjonalny sekret do HMAC (lepsze niż czyste hashowanie)
  readonly #hmacSecret?: string
  // długość w bajtach dla CSPRNG
  static readonly BYTES = 32 // 256-bit

  constructor() {
    this.#hmacSecret = process.env.TOKEN_HMAC_SECRET || undefined
  }

  /**
   * Generuje nowy token w formacie Base64URL (bez '=' i znaków +,/)
   */
  generate(): string {
    const buf = randomBytes(TokenGenerator.BYTES) // CSPRNG
    return TokenGenerator.toBase64Url(buf)
  }

  /**
   * Buduje wartość nagłówka Authorization dla OCPI:
   * "Token " + Base64(ASCII(token))
   * Spec OCPI wymaga, aby WARTOŚĆ w nagłówku była Base64. Token może być ASCII.
   */
  toAuthorizationHeader(token: string): string {
    const base64 = Buffer.from(token, 'utf8').toString('base64') // klasyczny Base64
    return `Token ${base64}`
  }

  /**
   * Odczyt tokenu z nagłówka "Authorization: Token <base64-ascii>"
   * Zwraca oryginalny ASCII token (np. nasz Base64URL)
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
   * Zwraca hash tokenu do przechowywania w bazie (hex).
   * Preferowany HMAC-SHA-256 z sekretem; fallback na SHA-256 jeśli brak sekretu.
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
   * Stałoczasowa weryfikacja podanego tokenu względem przechowywanego hash-a.
   */
  verify(token: string, storedHashHex: string): boolean {
    const given = Buffer.from(this.hash(token), 'hex')
    const stored = Buffer.from(storedHashHex, 'hex')
    if (given.length !== stored.length) return false
    return timingSafeEqual(given, stored)
  }

  // --- helpers ---

  /** Base64URL bez paddingu '=' */
  private static toBase64Url(buf: Buffer): string {
    return buf
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
  }
}
