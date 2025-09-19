# Locations Module Implementation

## Overview

The Locations module enables CPOs to share information about their charging locations, EVSEs, and connectors with eMSPs. This module is fundamental to the OCPI ecosystem as it provides the foundation for charge point discovery and real-time status updates.

## Architecture

### Role-Based Module Structure

Following our established pattern, the Locations module is split into three main components:

```
src/ocpi/v2_2_1/
├── common/
│   └── locations/
│       ├── dto/
│       │   ├── location.dto.ts           # Location, EVSE, Connector DTOs
│       │   ├── location-status.dto.ts    # Status and capability enums
│       │   └── location-query.dto.ts     # Query parameter DTOs
│       ├── repositories/
│       │   ├── location.repository.ts    # Interface
│       │   └── location-prisma.repository.ts # Prisma implementation
│       ├── services/
│       │   └── location.service.ts       # Business logic service
│       └── locations.module.ts           # Common module
├── cpo/
│   └── locations/
│       ├── locations.controller.ts       # Sender interface (GET)
│       └── locations.module.ts           # CPO-specific module
└── emp/
    └── locations/
        ├── locations.controller.ts       # Receiver interface (PUT/PATCH/GET)
        └── locations.module.ts           # EMP-specific module
```

## Implementation Plan

### Phase 1: Common Infrastructure

#### 1.1 DTOs and Validation
- **LocationDto**: Main location object with all OCPI fields
- **EvseDto**: EVSE object with status and capabilities
- **ConnectorDto**: Connector object with technical specifications
- **LocationStatusDto**: Status updates and schedules
- **LocationQueryDto**: Query parameters for filtering and pagination

#### 1.2 Repository Layer
- **LocationRepository**: Abstract interface defining data operations
- **LocationPrismaRepository**: Prisma-based implementation
- Support for hierarchical updates (Location -> EVSE -> Connector)
- Efficient querying with date ranges and pagination

#### 1.3 Business Logic Service
- **LocationService**: Core business logic
- Domain model to DTO mapping
- Validation and error handling
- Status change notifications

### Phase 2: CPO Implementation (Sender Interface)

#### 2.1 CPO Controller
- **GET /ocpi/cpo/2.2.1/locations** - List locations with pagination/filtering
- **GET /ocpi/cpo/2.2.1/locations/{location_id}** - Get specific location
- **GET /ocpi/cpo/2.2.1/locations/{location_id}/{evse_uid}** - Get specific EVSE
- **GET /ocpi/cpo/2.2.1/locations/{location_id}/{evse_uid}/{connector_id}** - Get specific connector

#### 2.2 Features
- Date-based filtering (last_updated)
- Pagination support
- Hierarchical object retrieval
- Proper OCPI response envelopes

### Phase 3: EMP Implementation (Receiver Interface)

#### 3.1 EMP Controller
- **GET /ocpi/emsp/2.2.1/locations/{country_code}/{party_id}/{location_id}** - Retrieve location for validation
- **PUT /ocpi/emsp/2.2.1/locations/{country_code}/{party_id}/{location_id}** - Create/replace location
- **PATCH /ocpi/emsp/2.2.1/locations/{country_code}/{party_id}/{location_id}** - Update location
- Support for EVSE and Connector level operations

#### 3.2 Features
- Client Owned Object pattern with country_code/party_id
- Hierarchical updates with proper last_updated propagation
- Status change handling (REMOVED status for deletion)
- Validation of incoming data

## OCPI Compliance Requirements

### Data Ownership
- **CPO owns Location data**: All modifications originate from CPO
- **eMSP receives updates**: Push model for real-time updates
- **Pull model fallback**: eMSP can fetch data when needed

### Status Management
- **Status propagation**: EVSE status changes affect Location last_updated
- **Removal handling**: Use REMOVED status instead of DELETE operations
- **Schedule support**: Future status changes via status_schedule

### Hierarchical Updates
- **Location updates**: Full location replacement
- **EVSE updates**: Update specific EVSE, propagate to Location
- **Connector updates**: Update specific connector, propagate to EVSE and Location

## TDD Implementation Strategy

### Test Structure
```
src/ocpi/v2_2_1/common/locations/
├── dto/
│   └── location.dto.spec.ts
├── repositories/
│   └── location-prisma.repository.spec.ts
├── services/
│   └── location.service.spec.ts
└── __tests__/
    └── integration/
        └── locations.integration.spec.ts

src/ocpi/v2_2_1/cpo/locations/
└── locations.controller.spec.ts

src/ocpi/v2_2_1/emp/locations/
└── locations.controller.spec.ts
```

### Test Coverage Areas

#### Unit Tests
- DTO validation and transformation
- Repository CRUD operations
- Service business logic
- Domain model integration

#### Integration Tests
- End-to-end location workflows
- Hierarchical update scenarios
- Error handling and edge cases
- OCPI compliance validation

#### Controller Tests
- HTTP endpoint behavior
- Authentication and authorization
- Pagination and filtering
- OCPI response format compliance

## Domain Model Integration

### Leveraging Existing Domain Models
- **Location aggregate**: Complete domain model already implemented
- **EVSE entity**: Status management and operational logic
- **Connector entity**: Technical specifications and availability
- **Value objects**: LocationId, GeoLocation, Image, BusinessDetails

### Mapping Strategy
- **Domain to DTO**: Clean mapping with proper field transformation
- **DTO to Domain**: Validation and business rule enforcement
- **Immutable updates**: Domain models are immutable, create new instances

## Database Schema Considerations

### Tables Required
- `locations`: Main location data
- `evses`: EVSE data with location foreign key
- `connectors`: Connector data with EVSE foreign key
- `location_images`: Image associations
- `location_facilities`: Facility associations

### Indexing Strategy
- `last_updated` for efficient date-range queries
- `country_code + party_id + location_id` for client-owned object lookups
- `status` for operational queries

## Error Handling

### OCPI Exception Mapping
- **2001 InvalidParametersException**: Invalid request data
- **2003 UnknownLocationException**: Location not found
- **3000 GenericServerException**: Internal server errors

### Validation Strategy
- **Zod schemas**: Runtime validation for DTOs
- **Domain validation**: Business rule enforcement
- **OCPI compliance**: Protocol-specific validation

## Performance Considerations

### Caching Strategy
- **Location data caching**: Redis cache for frequently accessed locations
- **Status updates**: Real-time invalidation on status changes
- **Pagination optimization**: Efficient database queries

### Push Model Implementation
- **WebSocket connections**: Real-time status updates
- **Batch processing**: Efficient bulk updates
- **Retry mechanisms**: Reliable delivery to eMSPs

## Security and Authorization

### Access Control
- **Token-based authentication**: OCPI credential tokens
- **Role-based access**: CPO can only modify own locations
- **Data isolation**: Party-specific data segregation

### Input Validation
- **Request validation**: All input thoroughly validated
- **SQL injection prevention**: Parameterized queries
- **XSS protection**: Output encoding for dynamic content

## Monitoring and Observability

### Metrics
- **API response times**: Performance monitoring
- **Update frequencies**: Location change patterns
- **Error rates**: System health monitoring

### Logging
- **Structured logging**: JSON format with context
- **Audit trails**: Location modification history
- **Debug information**: Detailed error context

This implementation plan ensures OCPI compliance while leveraging our existing domain models and following established architectural patterns.