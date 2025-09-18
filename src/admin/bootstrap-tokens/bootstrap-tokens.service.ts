// admin/bootstrap-tokens/bootstrap-tokens.service.ts
import { Injectable } from '@nestjs/common'
import {
  BootstrapTokensRepository,
  type CreateBootstrapTokenDto,
  type BootstrapTokenInfo,
  type BootstrapTokenValidationResult,
} from '@/infrastructure/persistence/bootstrap-tokens.repository'
import { TokenGenerator } from '@/infrastructure/security/token-generator'

export interface CreateBootstrapTokenRequest {
  description?: string
  expiresInDays?: number
}

export interface BootstrapTokenResponse {
  id: string
  token: string
  description: string | null
  expiresAt: string | null
  usedAt: string | null
  usedBy: string | null
  isActive: boolean
  createdAt: string
}

@Injectable()
export class BootstrapTokensService {
  readonly #repository: BootstrapTokensRepository
  readonly #tokenGenerator: TokenGenerator

  constructor(
    repository: BootstrapTokensRepository,
    tokenGenerator: TokenGenerator,
  ) {
    this.#repository = repository
    this.#tokenGenerator = tokenGenerator
  }

  async createToken(
    request: CreateBootstrapTokenRequest,
  ): Promise<BootstrapTokenResponse> {
    const token = this.#tokenGenerator.generate()

    const expiresAt: Date | undefined =
      request.expiresInDays && request.expiresInDays > 0
        ? new Date(Date.now() + request.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined

    const dto: CreateBootstrapTokenDto = {
      token,
      description: request.description,
      expiresAt,
    }

    const created = await this.#repository.create(dto)
    return this.mapToResponse(created)
  }

  async listTokens(includeUsed = false): Promise<BootstrapTokenResponse[]> {
    const tokens = await this.#repository.findAll(includeUsed)
    return tokens.map((token) => this.mapToResponse(token))
  }

  async getTokenById(id: string): Promise<BootstrapTokenResponse | null> {
    const tokens = await this.#repository.findAll(true)
    const token = tokens.find((t) => t.id === id)
    return token ? this.mapToResponse(token) : null
  }

  async deactivateToken(id: string): Promise<void> {
    await this.#repository.deactivate(id)
  }

  async validateBootstrapToken(token: string): Promise<boolean> {
    return this.#repository.validateToken(token)
  }

  async validateBootstrapTokenDetailed(
    token: string,
  ): Promise<BootstrapTokenValidationResult> {
    return this.#repository.validateTokenDetailed(token)
  }

  async markTokenAsUsed(token: string, usedBy: string): Promise<void> {
    await this.#repository.markAsUsed(token, usedBy)
  }

  async cleanupExpiredTokens(): Promise<number> {
    return this.#repository.deleteExpired()
  }

  private mapToResponse(token: BootstrapTokenInfo): BootstrapTokenResponse {
    return {
      id: token.id,
      token: token.token,
      description: token.description,
      expiresAt: token.expiresAt?.toISOString() || null,
      usedAt: token.usedAt?.toISOString() || null,
      usedBy: token.usedBy,
      isActive: !token.usedAt, // Token is active if it hasn't been used
      createdAt: token.createdAt.toISOString(),
    }
  }
}
