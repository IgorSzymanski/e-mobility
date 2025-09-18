-- CreateEnum
CREATE TYPE "ocpi"."OcpiPeerStatus" AS ENUM ('REGISTERED', 'PENDING', 'REVOKED');

-- CreateEnum
CREATE TYPE "ocpi"."OcpiRole" AS ENUM ('cpo', 'emsp');

-- CreateEnum
CREATE TYPE "ocpi"."OcpiVersion" AS ENUM ('2.2.1', '2.3.0');

-- CreateEnum
CREATE TYPE "ocpi"."OcpiModuleIdentifier" AS ENUM ('sessions', 'cdrs', 'locations', 'tokens', 'commands', 'tariffs', 'credentials', 'versions');

-- CreateTable
CREATE TABLE "ocpi"."peers" (
    "id" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "party_id" CHAR(3) NOT NULL,
    "base_versions_url" VARCHAR(512) NOT NULL,
    "roles_json" JSONB NOT NULL,
    "chosen_version" "ocpi"."OcpiVersion" NOT NULL,
    "our_token_for_peer" VARCHAR(128) NOT NULL,
    "peer_token_for_us" VARCHAR(128) NOT NULL,
    "status" "ocpi"."OcpiPeerStatus" NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocpi"."peer_endpoints" (
    "peer_id" TEXT NOT NULL,
    "module" "ocpi"."OcpiModuleIdentifier" NOT NULL,
    "role" "ocpi"."OcpiRole" NOT NULL,
    "url" VARCHAR(1024) NOT NULL,

    CONSTRAINT "peer_endpoints_pkey" PRIMARY KEY ("peer_id","module","role")
);

-- CreateTable
CREATE TABLE "ocpi"."version_details" (
    "id" TEXT NOT NULL,
    "role" "ocpi"."OcpiRole" NOT NULL,
    "version" "ocpi"."OcpiVersion" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "version_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocpi"."module_endpoints" (
    "id" TEXT NOT NULL,
    "version_detail_id" TEXT NOT NULL,
    "identifier" "ocpi"."OcpiModuleIdentifier" NOT NULL,
    "url" VARCHAR(1024) NOT NULL,

    CONSTRAINT "module_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "peers_status_idx" ON "ocpi"."peers"("status");

-- CreateIndex
CREATE INDEX "peers_chosen_version_idx" ON "ocpi"."peers"("chosen_version");

-- CreateIndex
CREATE UNIQUE INDEX "peers_country_code_party_id_key" ON "ocpi"."peers"("country_code", "party_id");

-- CreateIndex
CREATE INDEX "version_details_role_idx" ON "ocpi"."version_details"("role");

-- CreateIndex
CREATE INDEX "version_details_version_idx" ON "ocpi"."version_details"("version");

-- CreateIndex
CREATE UNIQUE INDEX "version_details_role_version_key" ON "ocpi"."version_details"("role", "version");

-- CreateIndex
CREATE UNIQUE INDEX "module_endpoints_version_detail_id_identifier_key" ON "ocpi"."module_endpoints"("version_detail_id", "identifier");

-- AddForeignKey
ALTER TABLE "ocpi"."peer_endpoints" ADD CONSTRAINT "peer_endpoints_peer_id_fkey" FOREIGN KEY ("peer_id") REFERENCES "ocpi"."peers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocpi"."module_endpoints" ADD CONSTRAINT "module_endpoints_version_detail_id_fkey" FOREIGN KEY ("version_detail_id") REFERENCES "ocpi"."version_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;
