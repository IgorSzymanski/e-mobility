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
  isActive: boolean
  createdAt: Date
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
    const bootstrapToken = await this.findByToken(token)

    if (!bootstrapToken) {
      return false
    }

    // Check if token is active
    if (!bootstrapToken.isActive) {
      return false
    }

    // Check if token has expired
    if (bootstrapToken.expiresAt && bootstrapToken.expiresAt < new Date()) {
      return false
    }

    // Check if token has already been used
    if (bootstrapToken.usedAt) {
      return false
    }

    return true
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
        isActive: false,
      },
    })
  }

  async findAll(includeInactive = false): Promise<BootstrapTokenInfo[]> {
    const tokens = await this.#db.ocpiBootstrapToken.findMany({
      where: includeInactive ? {} : { isActive: true },
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
    isActive: boolean
    createdAt: Date
  }): BootstrapTokenInfo {
    return {
      id: token.id,
      token: token.token,
      description: token.description,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      usedBy: token.usedBy,
      isActive: token.isActive,
      createdAt: token.createdAt,
    }
  }
}
