# Claude Code Instructions for E-Mobility Project

## Project Overview
This is a NestJS-based e-mobility application using TypeScript for communication with Charge Point Operators (CPOs) and E-Mobility Service Providers (EMSPs) via the OCPI (Open Charge Point Interface) protocol. The project supports OCPI versions 2.2.1 and 2.3.0 and follows standard NestJS conventions and patterns.

## OCPI Protocol Compliance
- **OCPI Versions**: Support for OCPI 2.2.1 and 2.3.0
- **Communication**: Facilitate secure communication between CPOs and EMSPs
- **Compliance**: Strictly adhere to OCPI protocol specifications
- **Documentation**: OCPI protocol documentation and specifications are located in the `.claude/` directory - always reference these for implementation details and compliance requirements

## Architecture & Design Patterns
- **Domain-Driven Design (DDD)**: Follow DDD principles with clear domain boundaries
- **Event-Driven Architecture**: Use events for decoupled communication between bounded contexts
- **Object-Oriented Programming (OOP)**: Leverage OOP principles for clean, maintainable code
- **Prisma Models**: Use Prisma for database modeling and type-safe database access

## Development Commands
- **Build**: `pnpm build`
- **Start Dev**: `pnpm start:dev`
- **Lint**: `pnpm lint`
- **Format**: `pnpm format`
- **Test**: `pnpm test`
- **Test Coverage**: `pnpm test:cov`
- **E2E Tests**: `pnpm test:e2e`

## Code Quality
Always run these commands after making changes:
1. `pnpm lint` - Fix linting issues
2. `pnpm format` - Format code with Prettier
3. `pnpm test` - Ensure tests pass

## Project Structure
- `src/` - Main source code
- `test/` - End-to-end tests
- `src/**/*.spec.ts` - Unit tests (co-located with source files)

## NestJS Conventions
- Use decorators for controllers, services, and modules
- Follow dependency injection patterns
- Implement proper error handling
- Use DTOs for data validation
- Follow modular architecture with feature modules

## Validation & Schema
- **Zod v4**: Use Zod v4 for runtime validation and schema definition
- Integrate Zod schemas with NestJS DTOs for type-safe validation
- Leverage Zod's latest features and syntax from version 4

## Testing
- Unit tests: `*.spec.ts` files alongside source code
- E2E tests: Located in `test/` directory
- Use Jest as the testing framework
- Maintain good test coverage
- **Nock**: Use nock for mocking HTTP requests in integration tests

## TypeScript
- Strict TypeScript configuration
- Use proper typing for all functions and variables
- Leverage NestJS decorators and types

## Package Manager
This project uses pnpm as indicated by `pnpm-lock.yaml`. Use pnpm commands when running scripts.

## Database (PostgreSQL)
This project uses PostgreSQL with Prisma ORM. For development, use Docker:

### Database Commands
- **Start Database**: `pnpm docker:dev:up` - Starts PostgreSQL in Docker
- **Stop Database**: `pnpm docker:dev:down` - Stops the database
- **View Logs**: `pnpm docker:dev:logs` - View database logs
- **Reset Database**: `pnpm db:reset` - Completely reset database (removes all data)

### Database Setup
1. Copy `.env.example` to `.env`
2. Start the database: `pnpm docker:dev:up`
3. Run Prisma migrations: `pnpx prisma migrate dev`
4. Optional: Generate Prisma client: `pnpx prisma generate`

### Database Configuration
- **Host**: localhost
- **Port**: 5432
- **Database**: e_mobility
- **Username**: postgres
- **Password**: postgres
- **Connection URL**: postgresql://postgres:postgres@localhost:5432/e_mobility?schema=public

## Git Commit Guidelines

### Commit Message Format
Use [Conventional Commits](https://www.conventionalcommits.org/) format for all commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

**Examples:**
- `feat(auth): add JWT token validation`
- `fix(api): handle null response in user service`
- `docs: update API documentation`
- `refactor(ocpi): improve error handling structure`

### Commit Authorship
- **DO NOT** mention Claude, AI, or automated tools in commit messages
- **DO NOT** add Co-Authored-By lines for Claude or AI tools
- Keep commits clean and focused on the actual changes made
- Write commit messages as if a human developer made the changes

## Architecture Guidelines
- Maintain clean separation of concerns between modules
- Design modules to be self-contained with minimal coupling
- Follow dependency injection patterns to promote modularity

## Type Safety Guidelines
- **Avoid type casting at all cost** - Never use `as Type` or unsafe type assertions
- Use **type guards** to safely narrow types (e.g., `isValidRole(value): value is Role`)
- Use **Zod schemas** to validate runtime data, especially JSON from databases
- Prefer **switch statements over if-else chains** when doing mappings
- Use proper **type narrowing techniques** instead of forcing types

## Database Schema Design Guidelines
- **Avoid Boolean fields** - Instead of boolean flags like `isActive`, use DateTime fields that capture when events occurred
- **Use timestamps for state tracking** - Fields like `activatedAt`, `deactivatedAt`, `usedAt`, `revokedAt` provide more valuable information than simple boolean flags
- **Design for auditability** - DateTime fields enable better tracking of when state changes occurred
- **Implicit state from presence** - A null `usedAt` field implies unused state, a populated field implies used state

## Immutable Code Guidelines
- **Avoid mutable variable declarations** - Never use `var` or `let` keywords; prefer `const` for all declarations
- **Avoid mutating methods** - Never use methods like `Array.push()`, `Array.pop()`, `Array.splice()`, or direct property assignment
- **Use immutable array operations** - Prefer methods like `[...array, newItem]`, `array.filter()`, `array.map()`, `array.concat()`
- **Use immutable object operations** - Prefer spread syntax `{...object, newProp: value}` over direct property assignment
- **Functional programming principles** - Write pure functions that don't modify input parameters and always return new values
- **Benefits of immutability** - Prevents side effects, makes code more predictable, easier to test, and reduces bugs