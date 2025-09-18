// infrastructure/persistence/bootstrap-tokens.repository.ts
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

export interface CreateBootstrapTokenDto {
  token: string
  description?: string
  expiresAt?: Date
}

export interface BootstrapTokenInfo {
  id: string
  token: string
  description: string | null
  expiresAt: Date | null
  usedAt: Date | null
  usedBy: string | null
  createdAt: Date
}

export enum BootstrapTokenValidationError {
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  TOKEN_ALREADY_USED = 'TOKEN_ALREADY_USED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
}

export interface BootstrapTokenValidationResult {
  isValid: boolean
  error?: BootstrapTokenValidationError
  errorMessage?: string
  usedAt?: Date
  usedBy?: string
  expiresAt?: Date
}

@Injectable()
export class BootstrapTokensRepository {
  readonly #db: PrismaClient

  constructor(db: PrismaClient) {
    this.#db = db
  }

  async create(dto: CreateBootstrapTokenDto): Promise<BootstrapTokenInfo> {
    const token = await this.#db.ocpiBootstrapToken.create({
      data: {
        token: dto.token,
        description: dto.description,
        expiresAt: dto.expiresAt,
      },
    })

    return this.mapToTokenInfo(token)
  }

  async findByToken(token: string): Promise<BootstrapTokenInfo | null> {
    const bootstrapToken = await this.#db.ocpiBootstrapToken.findUnique({
      where: { token },
    })

    return bootstrapToken ? this.mapToTokenInfo(bootstrapToken) : null
  }

  async validateToken(token: string): Promise<boolean> {
    const result = await this.validateTokenDetailed(token)
    return result.isValid
  }

  async validateTokenDetailed(
    token: string,
  ): Promise<BootstrapTokenValidationResult> {
    const bootstrapToken = await this.findByToken(token)

    if (!bootstrapToken) {
      return {
        isValid: false,
        error: BootstrapTokenValidationError.TOKEN_NOT_FOUND,
        errorMessage: 'Bootstrap token not found',
      }
    }

    // Check if token has already been used
    if (bootstrapToken.usedAt) {
      return {
        isValid: false,
        error: BootstrapTokenValidationError.TOKEN_ALREADY_USED,
        errorMessage: `Bootstrap token was already used on ${bootstrapToken.usedAt.toISOString()}`,
        usedAt: bootstrapToken.usedAt,
        usedBy: bootstrapToken.usedBy || undefined,
      }
    }

    // Check if token has expired
    if (bootstrapToken.expiresAt && bootstrapToken.expiresAt < new Date()) {
      return {
        isValid: false,
        error: BootstrapTokenValidationError.TOKEN_EXPIRED,
        errorMessage: `Bootstrap token expired on ${bootstrapToken.expiresAt.toISOString()}`,
        expiresAt: bootstrapToken.expiresAt,
      }
    }

    return {
      isValid: true,
    }
  }

  async markAsUsed(token: string, usedBy: string): Promise<void> {
    await this.#db.ocpiBootstrapToken.update({
      where: { token },
      data: {
        usedAt: new Date(),
        usedBy,
      },
    })
  }

  async deactivate(id: string): Promise<void> {
    await this.#db.ocpiBootstrapToken.update({
      where: { id },
      data: {
        usedAt: new Date(),
        usedBy: 'ADMIN_DEACTIVATED',
      },
    })
  }

  async findAll(includeUsed = false): Promise<BootstrapTokenInfo[]> {
    const tokens = await this.#db.ocpiBootstrapToken.findMany({
      where: includeUsed ? {} : { usedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    return tokens.map((token) => this.mapToTokenInfo(token))
  }

  async deleteExpired(): Promise<number> {
    const result = await this.#db.ocpiBootstrapToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })

    return result.count
  }

  private mapToTokenInfo(token: {
    id: string
    token: string
    description: string | null
    expiresAt: Date | null
    usedAt: Date | null
    usedBy: string | null
    createdAt: Date
    updatedAt: Date
  }): BootstrapTokenInfo {
    return {
      id: token.id,
      token: token.token,
      description: token.description,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      usedBy: token.usedBy,
      createdAt: token.createdAt,
    }
  }
}
