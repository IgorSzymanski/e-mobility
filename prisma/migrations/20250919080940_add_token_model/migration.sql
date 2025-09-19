-- CreateEnum
CREATE TYPE "ocpi"."OcpiTokenType" AS ENUM ('RFID', 'APP_USER', 'AD_HOC_USER', 'OTHER');

-- CreateEnum
CREATE TYPE "ocpi"."OcpiWhitelistType" AS ENUM ('ALWAYS', 'ALLOWED', 'ALLOWED_OFFLINE', 'NEVER');

-- CreateTable
CREATE TABLE "ocpi"."tokens" (
    "id" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "party_id" CHAR(3) NOT NULL,
    "uid" VARCHAR(36) NOT NULL,
    "type" "ocpi"."OcpiTokenType" NOT NULL,
    "contract_id" VARCHAR(36) NOT NULL,
    "visual_number" VARCHAR(64),
    "issuer" VARCHAR(64) NOT NULL,
    "group_id" VARCHAR(36),
    "valid" BOOLEAN NOT NULL,
    "whitelist" "ocpi"."OcpiWhitelistType" NOT NULL,
    "language" CHAR(2),
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tokens_uid_type_idx" ON "ocpi"."tokens"("uid", "type");

-- CreateIndex
CREATE INDEX "tokens_valid_idx" ON "ocpi"."tokens"("valid");

-- CreateIndex
CREATE INDEX "tokens_whitelist_idx" ON "ocpi"."tokens"("whitelist");

-- CreateIndex
CREATE INDEX "tokens_last_updated_idx" ON "ocpi"."tokens"("last_updated");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_country_code_party_id_uid_key" ON "ocpi"."tokens"("country_code", "party_id", "uid");
