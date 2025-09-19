-- CreateEnum
CREATE TYPE "ocpi"."OcpiStatus" AS ENUM ('AVAILABLE', 'BLOCKED', 'CHARGING', 'INOPERATIVE', 'OUTOFORDER', 'PLANNED', 'REMOVED', 'RESERVED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ocpi"."OcpiCapability" AS ENUM ('CHARGING_PROFILE_CAPABLE', 'CHARGING_PREFERENCES_CAPABLE', 'CHIP_CARD_SUPPORT', 'CONTACTLESS_CARD_SUPPORT', 'CREDIT_CARD_PAYABLE', 'DEBIT_CARD_PAYABLE', 'PED_TERMINAL', 'REMOTE_START_STOP_CAPABLE', 'RESERVABLE', 'RFID_READER', 'START_SESSION_CONNECTOR_REQUIRED', 'TOKEN_GROUP_CAPABLE', 'UNLOCK_CAPABLE');

-- CreateEnum
CREATE TYPE "ocpi"."OcpiConnectorType" AS ENUM ('CHADEMO', 'CHAOJI', 'DOMESTIC_A', 'DOMESTIC_B', 'DOMESTIC_C', 'DOMESTIC_D', 'DOMESTIC_E', 'DOMESTIC_F', 'DOMESTIC_G', 'DOMESTIC_H', 'DOMESTIC_I', 'DOMESTIC_J', 'DOMESTIC_K', 'DOMESTIC_L', 'DOMESTIC_M', 'DOMESTIC_N', 'DOMESTIC_O', 'GBT_AC', 'GBT_DC', 'IEC_60309_2_single_16', 'IEC_60309_2_three_16', 'IEC_60309_2_three_32', 'IEC_60309_2_three_64', 'IEC_62196_T1', 'IEC_62196_T1_COMBO', 'IEC_62196_T2', 'IEC_62196_T2_COMBO', 'IEC_62196_T3A', 'IEC_62196_T3C', 'NEMA_5_20', 'NEMA_6_30', 'NEMA_6_50', 'NEMA_10_30', 'NEMA_10_50', 'NEMA_14_30', 'NEMA_14_50', 'PANTOGRAPH_BOTTOM_UP', 'PANTOGRAPH_TOP_DOWN', 'TESLA_R', 'TESLA_S');

-- CreateEnum
CREATE TYPE "ocpi"."OcpiConnectorFormat" AS ENUM ('SOCKET', 'CABLE');

-- CreateEnum
CREATE TYPE "ocpi"."OcpiPowerType" AS ENUM ('AC_1_PHASE', 'AC_2_PHASE', 'AC_2_PHASE_SPLIT', 'AC_3_PHASE', 'DC');

-- CreateEnum
CREATE TYPE "ocpi"."OcpiParkingType" AS ENUM ('ALONG_MOTORWAY', 'PARKING_GARAGE', 'PARKING_LOT', 'ON_DRIVEWAY', 'ON_STREET', 'UNDERGROUND_GARAGE');

-- CreateEnum
CREATE TYPE "ocpi"."OcpiParkingRestriction" AS ENUM ('EV_ONLY', 'PLUGGED', 'DISABLED', 'CUSTOMERS', 'MOTORCYCLES');

-- CreateEnum
CREATE TYPE "ocpi"."OcpiFacility" AS ENUM ('HOTEL', 'RESTAURANT', 'CAFE', 'MALL', 'SUPERMARKET', 'SPORT', 'RECREATION_AREA', 'NATURE', 'MUSEUM', 'BIKE_SHARING', 'BUS_STOP', 'TAXI_STAND', 'TRAM_STOP', 'METRO_STATION', 'TRAIN_STATION', 'AIRPORT', 'PARKING_LOT', 'CARPOOL_PARKING', 'FUEL_STATION', 'WIFI');

-- CreateTable
CREATE TABLE "ocpi"."locations" (
    "id" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "party_id" CHAR(3) NOT NULL,
    "location_id" VARCHAR(36) NOT NULL,
    "publish" BOOLEAN NOT NULL,
    "publish_allowed_to" JSONB,
    "name" VARCHAR(255),
    "address" VARCHAR(45) NOT NULL,
    "city" VARCHAR(45) NOT NULL,
    "postal_code" VARCHAR(10),
    "state" VARCHAR(20),
    "country" CHAR(3) NOT NULL,
    "coordinates" JSONB NOT NULL,
    "related_locations" JSONB,
    "parking_type" "ocpi"."OcpiParkingType",
    "directions" JSONB,
    "operator" JSONB,
    "suboperator" JSONB,
    "owner" JSONB,
    "facilities" "ocpi"."OcpiFacility"[],
    "time_zone" VARCHAR(255) NOT NULL,
    "opening_times" JSONB,
    "charging_when_closed" BOOLEAN,
    "images" JSONB,
    "energy_mix" JSONB,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocpi"."evses" (
    "id" TEXT NOT NULL,
    "location_db_id" TEXT NOT NULL,
    "uid" VARCHAR(36) NOT NULL,
    "evse_id" VARCHAR(48),
    "status" "ocpi"."OcpiStatus" NOT NULL,
    "status_schedule" JSONB,
    "capabilities" "ocpi"."OcpiCapability"[],
    "floor_level" VARCHAR(4),
    "coordinates" JSONB,
    "physical_reference" VARCHAR(16),
    "directions" JSONB,
    "parking_restrictions" "ocpi"."OcpiParkingRestriction"[],
    "images" JSONB,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocpi"."connectors" (
    "id" TEXT NOT NULL,
    "evse_db_id" TEXT NOT NULL,
    "connector_id" VARCHAR(36) NOT NULL,
    "standard" "ocpi"."OcpiConnectorType" NOT NULL,
    "format" "ocpi"."OcpiConnectorFormat" NOT NULL,
    "power_type" "ocpi"."OcpiPowerType" NOT NULL,
    "max_voltage" INTEGER NOT NULL,
    "max_amperage" INTEGER NOT NULL,
    "max_electric_power" INTEGER,
    "tariff_ids" VARCHAR(36)[],
    "terms_and_conditions" VARCHAR(1024),
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_last_updated_idx" ON "ocpi"."locations"("last_updated");

-- CreateIndex
CREATE INDEX "locations_publish_idx" ON "ocpi"."locations"("publish");

-- CreateIndex
CREATE INDEX "locations_country_code_party_id_idx" ON "ocpi"."locations"("country_code", "party_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_country_code_party_id_location_id_key" ON "ocpi"."locations"("country_code", "party_id", "location_id");

-- CreateIndex
CREATE INDEX "evses_status_idx" ON "ocpi"."evses"("status");

-- CreateIndex
CREATE INDEX "evses_last_updated_idx" ON "ocpi"."evses"("last_updated");

-- CreateIndex
CREATE UNIQUE INDEX "evses_location_db_id_uid_key" ON "ocpi"."evses"("location_db_id", "uid");

-- CreateIndex
CREATE INDEX "connectors_last_updated_idx" ON "ocpi"."connectors"("last_updated");

-- CreateIndex
CREATE UNIQUE INDEX "connectors_evse_db_id_connector_id_key" ON "ocpi"."connectors"("evse_db_id", "connector_id");

-- AddForeignKey
ALTER TABLE "ocpi"."evses" ADD CONSTRAINT "evses_location_db_id_fkey" FOREIGN KEY ("location_db_id") REFERENCES "ocpi"."locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocpi"."connectors" ADD CONSTRAINT "connectors_evse_db_id_fkey" FOREIGN KEY ("evse_db_id") REFERENCES "ocpi"."evses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
