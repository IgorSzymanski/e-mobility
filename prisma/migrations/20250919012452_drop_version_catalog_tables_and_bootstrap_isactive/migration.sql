/*
  Warnings:

  - You are about to drop the column `is_active` on the `bootstrap_tokens` table. All the data in the column will be lost.
  - You are about to drop the `module_endpoints` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `version_details` table. If the table is not empty, all the data it contains will be lost.

*/

-- DropForeignKey
ALTER TABLE "ocpi"."module_endpoints" DROP CONSTRAINT "module_endpoints_version_detail_id_fkey";

-- DropIndex
DROP INDEX "ocpi"."bootstrap_tokens_is_active_idx";

-- AlterTable
ALTER TABLE "ocpi"."bootstrap_tokens" DROP COLUMN "is_active";

-- DropTable
DROP TABLE "ocpi"."module_endpoints";

-- DropTable
DROP TABLE "ocpi"."version_details";