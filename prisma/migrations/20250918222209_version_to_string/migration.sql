/*
  Warnings:

  - Changed the type of `chosen_version` on the `peers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `version` on the `version_details` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ocpi"."peers" DROP COLUMN "chosen_version",
ADD COLUMN     "chosen_version" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ocpi"."version_details" DROP COLUMN "version",
ADD COLUMN     "version" TEXT NOT NULL;

-- DropEnum
DROP TYPE "ocpi"."OcpiVersion";

-- CreateIndex
CREATE INDEX "peers_chosen_version_idx" ON "ocpi"."peers"("chosen_version");

-- CreateIndex
CREATE INDEX "version_details_version_idx" ON "ocpi"."version_details"("version");

-- CreateIndex
CREATE UNIQUE INDEX "version_details_role_version_key" ON "ocpi"."version_details"("role", "version");
