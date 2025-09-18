-- CreateTable
CREATE TABLE "ocpi"."bootstrap_tokens" (
    "id" TEXT NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "description" VARCHAR(512),
    "expires_at" TIMESTAMP(3),
    "used_at" TIMESTAMP(3),
    "used_by" VARCHAR(128),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bootstrap_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bootstrap_tokens_token_key" ON "ocpi"."bootstrap_tokens"("token");

-- CreateIndex
CREATE INDEX "bootstrap_tokens_token_idx" ON "ocpi"."bootstrap_tokens"("token");

-- CreateIndex
CREATE INDEX "bootstrap_tokens_is_active_idx" ON "ocpi"."bootstrap_tokens"("is_active");

-- CreateIndex
CREATE INDEX "bootstrap_tokens_expires_at_idx" ON "ocpi"."bootstrap_tokens"("expires_at");
