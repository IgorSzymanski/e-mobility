import { z } from 'zod'
import type { Location } from '@/domain/locations/location.aggregate'
import type { EVSE } from '@/domain/locations/entities/evse'
import type { Connector } from '@/domain/locations/entities/connector'
import { Location as LocationDomain } from '@/domain/locations/location.aggregate'
import { LocationId } from '@/domain/locations/value-objects/location-id'
import { GeoLocation } from '@/domain/locations/value-objects/geo-location'

// OCPI 2.2.1 Capability enum
export const CapabilitySchema = z.enum([
  'CHARGING_PROFILE_CAPABLE',
  'CHARGING_PREFERENCES_CAPABLE',
  'CHIP_CARD_SUPPORT',
  'CONTACTLESS_CARD_SUPPORT',
  'CREDIT_CARD_PAYABLE',
  'DEBIT_CARD_PAYABLE',
  'PED_TERMINAL',
  'REMOTE_START_STOP_CAPABLE',
  'RESERVABLE',
  'RFID_READER',
  'START_SESSION_CONNECTOR_REQUIRED',
  'TOKEN_GROUP_CAPABLE',
  'UNLOCK_CAPABLE',
])

// OCPI 2.2.1 Status enum
export const StatusSchema = z.enum([
  'AVAILABLE',
  'BLOCKED',
  'CHARGING',
  'INOPERATIVE',
  'OUTOFORDER',
  'PLANNED',
  'REMOVED',
  'RESERVED',
  'UNKNOWN',
])

// OCPI 2.2.1 ConnectorType enum
export const ConnectorTypeSchema = z.enum([
  'CHADEMO',
  'CHAOJI',
  'DOMESTIC_A',
  'DOMESTIC_B',
  'DOMESTIC_C',
  'DOMESTIC_D',
  'DOMESTIC_E',
  'DOMESTIC_F',
  'DOMESTIC_G',
  'DOMESTIC_H',
  'DOMESTIC_I',
  'DOMESTIC_J',
  'DOMESTIC_K',
  'DOMESTIC_L',
  'DOMESTIC_M',
  'DOMESTIC_N',
  'DOMESTIC_O',
  'GBT_AC',
  'GBT_DC',
  'IEC_60309_2_single_16',
  'IEC_60309_2_three_16',
  'IEC_60309_2_three_32',
  'IEC_60309_2_three_64',
  'IEC_62196_T1',
  'IEC_62196_T1_COMBO',
  'IEC_62196_T2',
  'IEC_62196_T2_COMBO',
  'IEC_62196_T3A',
  'IEC_62196_T3C',
  'NEMA_5_20',
  'NEMA_6_30',
  'NEMA_6_50',
  'NEMA_10_30',
  'NEMA_10_50',
  'NEMA_14_30',
  'NEMA_14_50',
  'PANTOGRAPH_BOTTOM_UP',
  'PANTOGRAPH_TOP_DOWN',
  'TESLA_R',
  'TESLA_S',
])

// OCPI 2.2.1 ConnectorFormat enum
export const ConnectorFormatSchema = z.enum(['SOCKET', 'CABLE'])

// OCPI 2.2.1 PowerType enum
export const PowerTypeSchema = z.enum([
  'AC_1_PHASE',
  'AC_2_PHASE',
  'AC_2_PHASE_SPLIT',
  'AC_3_PHASE',
  'DC',
])

// OCPI 2.2.1 ParkingType enum
export const ParkingTypeSchema = z.enum([
  'ALONG_MOTORWAY',
  'PARKING_GARAGE',
  'PARKING_LOT',
  'ON_DRIVEWAY',
  'ON_STREET',
  'UNDERGROUND_GARAGE',
])

// OCPI 2.2.1 ParkingRestriction enum
export const ParkingRestrictionSchema = z.enum([
  'EV_ONLY',
  'PLUGGED',
  'DISABLED',
  'CUSTOMERS',
  'MOTORCYCLES',
])

// OCPI 2.2.1 Facility enum
export const FacilitySchema = z.enum([
  'HOTEL',
  'RESTAURANT',
  'CAFE',
  'MALL',
  'SUPERMARKET',
  'SPORT',
  'RECREATION_AREA',
  'NATURE',
  'MUSEUM',
  'BIKE_SHARING',
  'BUS_STOP',
  'TAXI_STAND',
  'TRAM_STOP',
  'METRO_STATION',
  'TRAIN_STATION',
  'AIRPORT',
  'PARKING_LOT',
  'CARPOOL_PARKING',
  'FUEL_STATION',
  'WIFI',
])

// OCPI 2.2.1 ImageCategory enum
export const ImageCategorySchema = z.enum([
  'CHARGER',
  'ENTRANCE',
  'LOCATION',
  'NETWORK',
  'OPERATOR',
  'OTHER',
  'OWNER',
])

// OCPI 2.2.1 GeoLocation class
export const GeoLocationDtoSchema = z.object({
  latitude: z.string().regex(/^-?[0-9]{1,2}\.[0-9]{5,7}$/),
  longitude: z.string().regex(/^-?[0-9]{1,3}\.[0-9]{5,7}$/),
})

// OCPI 2.2.1 AdditionalGeoLocation class
export const AdditionalGeoLocationDtoSchema = z.object({
  latitude: z.string().regex(/^-?[0-9]{1,2}\.[0-9]{5,7}$/),
  longitude: z.string().regex(/^-?[0-9]{1,3}\.[0-9]{5,7}$/),
  name: z
    .object({
      language: z.string().length(2),
      text: z.string().max(512),
    })
    .optional(),
})

// OCPI 2.2.1 DisplayText class
export const DisplayTextDtoSchema = z.object({
  language: z.string().length(2),
  text: z.string().max(512),
})

// OCPI 2.2.1 BusinessDetails class
export const BusinessDetailsDtoSchema = z.object({
  name: z.string().max(100),
  website: z.string().url().optional(),
  logo: z
    .object({
      url: z.string(),
      thumbnail: z.string().optional(),
      category: ImageCategorySchema,
      type: z.string().max(4),
      width: z.number().int().max(99999).optional(),
      height: z.number().int().max(99999).optional(),
    })
    .optional(),
})

// OCPI 2.2.1 Image class
export const ImageDtoSchema = z.object({
  url: z.string().url(),
  thumbnail: z.string().url().optional(),
  category: ImageCategorySchema,
  type: z.string().max(4),
  width: z.number().int().max(99999).optional(),
  height: z.number().int().max(99999).optional(),
})

// OCPI 2.2.1 RegularHours class
export const RegularHoursDtoSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  period_begin: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  period_end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
})

// OCPI 2.2.1 ExceptionalPeriod class
export const ExceptionalPeriodDtoSchema = z.object({
  period_begin: z.iso.datetime(),
  period_end: z.iso.datetime(),
})

// OCPI 2.2.1 Hours class
export const HoursDtoSchema = z.object({
  twentyfourseven: z.boolean(),
  regular_hours: z.array(RegularHoursDtoSchema).optional(),
  exceptional_openings: z.array(ExceptionalPeriodDtoSchema).optional(),
  exceptional_closings: z.array(ExceptionalPeriodDtoSchema).optional(),
})

// OCPI 2.2.1 EnergySource class
export const EnergySourceDtoSchema = z.object({
  source: z.enum([
    'NUCLEAR',
    'GENERAL_FOSSIL',
    'COAL',
    'GAS',
    'GENERAL_GREEN',
    'SOLAR',
    'WIND',
    'WATER',
  ]),
  percentage: z.number(),
})

// OCPI 2.2.1 EnvironmentalImpact class
export const EnvironmentalImpactDtoSchema = z.object({
  category: z.enum(['NUCLEAR_WASTE', 'CARBON_DIOXIDE']),
  amount: z.number(),
})

// OCPI 2.2.1 EnergyMix class
export const EnergyMixDtoSchema = z.object({
  is_green_energy: z.boolean(),
  energy_sources: z.array(EnergySourceDtoSchema).optional(),
  environ_impact: z.array(EnvironmentalImpactDtoSchema).optional(),
  supplier_name: z.string().max(64).optional(),
  energy_product_name: z.string().max(64).optional(),
})

// OCPI 2.2.1 StatusSchedule class
export const StatusScheduleDtoSchema = z.object({
  period_begin: z.iso.datetime(),
  period_end: z.iso.datetime().optional(),
  status: StatusSchema,
})

// OCPI 2.2.1 PublishTokenType class
export const PublishTokenTypeDtoSchema = z.object({
  uid: z.string().max(36).optional(),
  type: z.enum(['AD_HOC_USER', 'APP_USER', 'OTHER', 'RFID']).optional(),
  visual_number: z.string().max(64).optional(),
  issuer: z.string().max(64).optional(),
  group_id: z.string().max(36).optional(),
})

// OCPI 2.2.1 Connector class
export const ConnectorDtoSchema = z.object({
  id: z.string().max(36),
  standard: ConnectorTypeSchema,
  format: ConnectorFormatSchema,
  power_type: PowerTypeSchema,
  max_voltage: z.number().int(),
  max_amperage: z.number().int(),
  max_electric_power: z.number().int().optional(),
  tariff_ids: z.array(z.string().max(36)),
  terms_and_conditions: z.string().url().optional(),
  last_updated: z.iso.datetime(),
})

// OCPI 2.2.1 EVSE class
export const EvseDtoSchema = z.object({
  uid: z.string().max(36),
  evse_id: z.string().max(48).optional(),
  status: StatusSchema,
  status_schedule: z.array(StatusScheduleDtoSchema).optional(),
  capabilities: z.array(CapabilitySchema),
  connectors: z.array(ConnectorDtoSchema).min(1),
  floor_level: z.string().max(4).optional(),
  coordinates: GeoLocationDtoSchema.optional(),
  physical_reference: z.string().max(16).optional(),
  directions: z.array(DisplayTextDtoSchema).optional(),
  parking_restrictions: z.array(ParkingRestrictionSchema).optional(),
  images: z.array(ImageDtoSchema).optional(),
  last_updated: z.iso.datetime(),
})

// OCPI 2.2.1 Location class
export const LocationDtoSchema = z.object({
  country_code: z.string().length(2),
  party_id: z.string().length(3),
  id: z.string().max(36),
  publish: z.boolean(),
  publish_allowed_to: z.array(PublishTokenTypeDtoSchema).optional(),
  name: z.string().max(255).optional(),
  address: z.string().max(45),
  city: z.string().max(45),
  postal_code: z.string().max(10).optional(),
  state: z.string().max(20).optional(),
  country: z.string().length(3),
  coordinates: GeoLocationDtoSchema,
  related_locations: z.array(AdditionalGeoLocationDtoSchema).optional(),
  parking_type: ParkingTypeSchema.optional(),
  evses: z.array(EvseDtoSchema).optional(),
  directions: z.array(DisplayTextDtoSchema).optional(),
  operator: BusinessDetailsDtoSchema.optional(),
  suboperator: BusinessDetailsDtoSchema.optional(),
  owner: BusinessDetailsDtoSchema.optional(),
  facilities: z.array(FacilitySchema).optional(),
  time_zone: z.string().max(255),
  opening_times: HoursDtoSchema.optional(),
  charging_when_closed: z.boolean().optional(),
  images: z.array(ImageDtoSchema).optional(),
  energy_mix: EnergyMixDtoSchema.optional(),
  last_updated: z.iso.datetime(),
})

// Type exports for TypeScript
export type CapabilityDto = z.infer<typeof CapabilitySchema>
export type StatusDto = z.infer<typeof StatusSchema>
export type ConnectorTypeDto = z.infer<typeof ConnectorTypeSchema>
export type ConnectorFormatDto = z.infer<typeof ConnectorFormatSchema>
export type PowerTypeDto = z.infer<typeof PowerTypeSchema>
export type ParkingTypeDto = z.infer<typeof ParkingTypeSchema>
export type ParkingRestrictionDto = z.infer<typeof ParkingRestrictionSchema>
export type FacilityDto = z.infer<typeof FacilitySchema>
export type ImageCategoryDto = z.infer<typeof ImageCategorySchema>
export type GeoLocationDto = z.infer<typeof GeoLocationDtoSchema>
export type AdditionalGeoLocationDto = z.infer<
  typeof AdditionalGeoLocationDtoSchema
>
export type DisplayTextDto = z.infer<typeof DisplayTextDtoSchema>
export type BusinessDetailsDto = z.infer<typeof BusinessDetailsDtoSchema>
export type ImageDto = z.infer<typeof ImageDtoSchema>
export type RegularHoursDto = z.infer<typeof RegularHoursDtoSchema>
export type ExceptionalPeriodDto = z.infer<typeof ExceptionalPeriodDtoSchema>
export type HoursDto = z.infer<typeof HoursDtoSchema>
export type EnergySourceDto = z.infer<typeof EnergySourceDtoSchema>
export type EnvironmentalImpactDto = z.infer<
  typeof EnvironmentalImpactDtoSchema
>
export type EnergyMixDto = z.infer<typeof EnergyMixDtoSchema>
export type StatusScheduleDto = z.infer<typeof StatusScheduleDtoSchema>
export type PublishTokenTypeDto = z.infer<typeof PublishTokenTypeDtoSchema>
export type ConnectorDto = z.infer<typeof ConnectorDtoSchema>
export type EvseDto = z.infer<typeof EvseDtoSchema>
export type LocationDto = z.infer<typeof LocationDtoSchema>

// Location Mapper Functions
export class LocationMapper {
  static fromDomain(
    location: Location,
    countryCode: string,
    partyId: string,
  ): LocationDto {
    return {
      country_code: countryCode,
      party_id: partyId,
      id: location.id.id,
      publish: location.publish,
      publish_allowed_to: location.publishAllowedTo?.map((token) => ({
        uid: token.uid,
        type: token.type as 'AD_HOC_USER' | 'APP_USER' | 'OTHER' | 'RFID',
        visual_number: token.visualNumber,
        issuer: token.issuer,
        group_id: token.groupId,
      })),
      name: location.name,
      address: location.address,
      city: location.city,
      postal_code: location.postalCode,
      state: location.state,
      country: location.country,
      coordinates: {
        latitude: location.coordinates.latitude.toString(),
        longitude: location.coordinates.longitude.toString(),
      },
      related_locations: location.relatedLocations?.map((rel) => ({
        latitude: rel.coordinates.latitude.toString(),
        longitude: rel.coordinates.longitude.toString(),
        name: rel.name
          ? {
              language: rel.name.language,
              text: rel.name.text,
            }
          : undefined,
      })),
      parking_type: location.parkingType as ParkingTypeDto,
      evses: location.evses?.map((evse) => this.mapEvseFromDomain(evse)),
      directions: location.directions?.map((dir) => ({
        language: dir.language,
        text: dir.text,
      })),
      operator: location.operator
        ? {
            name: location.operator.name,
            website: location.operator.website,
            logo: location.operator.logo
              ? {
                  url: location.operator.logo.url,
                  thumbnail: location.operator.logo.thumbnail,
                  category: location.operator.logo.category as ImageCategoryDto,
                  type: location.operator.logo.type,
                  width: location.operator.logo.width,
                  height: location.operator.logo.height,
                }
              : undefined,
          }
        : undefined,
      suboperator: location.suboperator
        ? {
            name: location.suboperator.name,
            website: location.suboperator.website,
            logo: location.suboperator.logo
              ? {
                  url: location.suboperator.logo.url,
                  thumbnail: location.suboperator.logo.thumbnail,
                  category: location.suboperator.logo
                    .category as ImageCategoryDto,
                  type: location.suboperator.logo.type,
                  width: location.suboperator.logo.width,
                  height: location.suboperator.logo.height,
                }
              : undefined,
          }
        : undefined,
      owner: location.owner
        ? {
            name: location.owner.name,
            website: location.owner.website,
            logo: location.owner.logo
              ? {
                  url: location.owner.logo.url,
                  thumbnail: location.owner.logo.thumbnail,
                  category: location.owner.logo.category as ImageCategoryDto,
                  type: location.owner.logo.type,
                  width: location.owner.logo.width,
                  height: location.owner.logo.height,
                }
              : undefined,
          }
        : undefined,
      facilities: location.facilities as FacilityDto[],
      time_zone: location.timeZone,
      opening_times: location.openingTimes
        ? {
            twentyfourseven: location.openingTimes.twentyfourseven,
            regular_hours: location.openingTimes.regularHours?.map((hour) => ({
              weekday: hour.weekday,
              period_begin: hour.periodBegin,
              period_end: hour.periodEnd,
            })),
            exceptional_openings:
              location.openingTimes.exceptionalOpenings?.map((period) => ({
                period_begin: period.periodBegin.toISOString(),
                period_end: period.periodEnd.toISOString(),
              })),
            exceptional_closings:
              location.openingTimes.exceptionalClosings?.map((period) => ({
                period_begin: period.periodBegin.toISOString(),
                period_end: period.periodEnd.toISOString(),
              })),
          }
        : undefined,
      charging_when_closed: location.chargingWhenClosed,
      images: location.images?.map((image) => ({
        url: image.url,
        thumbnail: image.thumbnail,
        category: image.category as ImageCategoryDto,
        type: image.type,
        width: image.width,
        height: image.height,
      })),
      energy_mix: location.energyMix
        ? {
            is_green_energy: location.energyMix.isGreenEnergy,
            energy_sources: location.energyMix.energySources?.map((source) => ({
              source: source.source as EnergySourceDto['source'],
              percentage: source.percentage,
            })),
            environ_impact: location.energyMix.environImpact?.map((impact) => ({
              category: impact.category as EnvironmentalImpactDto['category'],
              amount: impact.amount,
            })),
            supplier_name: location.energyMix.supplierName,
            energy_product_name: location.energyMix.energyProductName,
          }
        : undefined,
      last_updated: location.lastUpdated.toISOString(),
    }
  }

  private static mapEvseFromDomain(evse: EVSE): EvseDto {
    return {
      uid: evse.uid,
      evse_id: evse.evseId,
      status: evse.status as StatusDto,
      status_schedule: evse.statusSchedule?.map((schedule) => ({
        period_begin: schedule.periodBegin.toISOString(),
        period_end: schedule.periodEnd?.toISOString(),
        status: schedule.status as StatusDto,
      })),
      capabilities: evse.capabilities as CapabilityDto[],
      connectors: evse.connectors.map((connector) =>
        this.mapConnectorFromDomain(connector),
      ),
      floor_level: evse.floorLevel,
      coordinates: evse.coordinates
        ? {
            latitude: evse.coordinates.latitude.toString(),
            longitude: evse.coordinates.longitude.toString(),
          }
        : undefined,
      physical_reference: evse.physicalReference,
      directions: evse.directions?.map((dir) => ({
        language: dir.language,
        text: dir.text,
      })),
      parking_restrictions: evse.parkingRestrictions as ParkingRestrictionDto[],
      images: evse.images?.map((image) => ({
        url: image.url,
        thumbnail: image.thumbnail,
        category: image.category as ImageCategoryDto,
        type: image.type,
        width: image.width,
        height: image.height,
      })),
      last_updated: evse.lastUpdated.toISOString(),
    }
  }

  private static mapConnectorFromDomain(connector: Connector): ConnectorDto {
    return {
      id: connector.id,
      standard: connector.standard as ConnectorTypeDto,
      format: connector.format as ConnectorFormatDto,
      power_type: connector.powerType as PowerTypeDto,
      max_voltage: connector.maxVoltage,
      max_amperage: connector.maxAmperage,
      max_electric_power: connector.maxElectricPower,
      tariff_ids: connector.tariffIds ? [...connector.tariffIds] : [],
      terms_and_conditions: connector.termsAndConditions,
      last_updated: connector.lastUpdated.toISOString(),
    }
  }

  static toDomain(locationDto: LocationDto): Location {
    const locationId = new LocationId(
      locationDto.country_code,
      locationDto.party_id,
      locationDto.id,
    )

    const coordinates = new GeoLocation(
      locationDto.coordinates.latitude,
      locationDto.coordinates.longitude,
    )

    return new LocationDomain(
      locationId,
      locationDto.publish,
      locationDto.address,
      locationDto.city,
      locationDto.country,
      coordinates,
      locationDto.time_zone,
      new Date(locationDto.last_updated),
      locationDto.name,
      locationDto.postal_code,
      locationDto.state,
      locationDto.related_locations,
      locationDto.parking_type,
      undefined, // EVSEs - would need proper mapping from DTO
      locationDto.directions,
      locationDto.operator,
      locationDto.suboperator,
      locationDto.owner,
      locationDto.facilities,
      locationDto.opening_times,
      locationDto.charging_when_closed,
      locationDto.images,
      locationDto.energy_mix,
      locationDto.publish_allowed_to,
    )
  }
}
