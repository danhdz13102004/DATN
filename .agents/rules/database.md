---
trigger: model_decision
description: Apply when working on the PostgreSQL database — covers naming conventions, UUID primary keys, timestamps, soft delete, indexing, pgvector embeddings, Flyway migrations, seed data, query rules, connection pool, and Testcontainers testing.
---

# database.md — PostgreSQL Database Rules

## Naming Conventions

- MUST use `snake_case` for all table names, column names, indexes, and constraints
- MUST use plural nouns for table names (e.g., `users`, `jobs`, `applications`)
- MUST use singular nouns for enum type names (e.g., `user_role`, `job_status`)
- MUST name foreign key columns as `{referenced_table_singular}_id` (e.g., `company_id`, `job_id`)
- MUST name join/bridge tables as `{table1}_{table2}` in alphabetical order (e.g., `job_skills`)
- MUST name boolean columns with `is_` or `has_` prefix (e.g., `is_read`, `is_default`, `has_applied`)
- MUST name indexes as `idx_{table}_{column(s)}` (e.g., `idx_jobs_company_id`)
- MUST name unique constraints as `uq_{table}_{column(s)}`
- MUST name check constraints as `chk_{table}_{description}`

## Primary Keys

- MUST use `UUID` as the primary key type for all tables
- MUST generate UUIDs at the application layer (Java `UUID.randomUUID()`) — MUST NOT use database-side `gen_random_uuid()` to keep ID generation independent of the database engine
- MUST name the primary key column `id` in every table

## Timestamps

- MUST include `created_at` (non-nullable) on every table
- MUST include `updated_at` (nullable) on tables where records are mutable
- MUST store all timestamps in UTC — MUST NOT store local timezone values
- MUST use `TIMESTAMP WITH TIME ZONE` (`timestamptz`) column type — MUST NOT use `TIMESTAMP WITHOUT TIME ZONE`
- MUST set `created_at` at the application layer during entity construction — MUST NOT rely on database `DEFAULT now()` for portability

## Soft Delete vs Hard Delete

- MUST use **hard delete** for transient/non-critical data: `otps`, `notifications`, `messages`
- MUST use **soft delete** for business-critical data: `users`, `companies`, `jobs`, `applications`, `resumes`
- MUST implement soft delete by adding a `deleted_at timestamptz NULL` column — MUST NOT use a boolean `is_deleted` flag
- MUST add a default scope/filter in the Repository layer to exclude soft-deleted records (`WHERE deleted_at IS NULL`)
- MUST NOT physically delete soft-deleted rows in application code — MUST use a scheduled cleanup job if purging is needed

## Indexing Rules

- MUST create an index on every foreign key column
- MUST create a composite index for columns frequently queried together (e.g., `idx_applications_job_id_status`)
- MUST create a unique index on columns with a business uniqueness constraint (e.g., `users.email`)
- MUST create a partial index for soft-deleted tables: `WHERE deleted_at IS NULL` to keep scans efficient
- MUST NOT create indexes speculatively — MUST justify each index with a query pattern
- MUST use `GIN` index on `jsonb` columns if any are introduced in the future
- MUST use appropriate pgvector index type on `embedding` columns (see pgvector section)

## pgvector (AI Embeddings)

- MUST enable the `pgvector` extension via migration: `CREATE EXTENSION IF NOT EXISTS vector`
- MUST use the `vector(dimension)` type with an explicit dimension matching the model output (e.g., `vector(384)` for all-MiniLM-L6-v2)
- MUST create an index on vector columns for similarity search: use `ivfflat` for moderate datasets or `hnsw` for larger datasets
  - IVFFlat: `CREATE INDEX idx_jobs_embedding ON jobs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
  - HNSW: `CREATE INDEX idx_jobs_embedding ON jobs USING hnsw (embedding vector_cosine_ops)`
- MUST use cosine distance (`<=>`) as the default similarity operator — MUST NOT use L2 distance unless explicitly required
- MUST NOT store embeddings as `text` or `jsonb` — MUST use the native `vector` type
- MUST regenerate embeddings and rebuild indexes when the AI model version changes

## Migration Rules (Flyway)

- MUST use **Flyway** for all database schema migrations
- MUST place migration files in `src/main/resources/db/migration/`
- MUST name migration files as `V{version}__{description}.sql` (e.g., `V1__create_users_table.sql`, `V2__add_embedding_to_jobs.sql`)
- MUST NOT modify or rename an already-applied migration file — MUST create a new migration for changes
- MUST write migrations as idempotent SQL when possible (`IF NOT EXISTS`, `IF EXISTS`)
- MUST include a `DOWN` migration strategy documented in comments for reversible changes
- MUST NOT use Hibernate `ddl-auto` in any environment except local throwaway testing — MUST set `spring.jpa.hibernate.ddl-auto=validate` in all other profiles
- MUST run migrations automatically on application startup in development; MUST run manually or via CI/CD in production

## Seed Data (CommandLineRunner Approach)

- MUST implement seeding via a dedicated Spring `CommandLineRunner` class (e.g., `DataSeeder.java`) in the `config` package
- MUST gate the seeder behind a Spring profile or environment variable — MUST only run when `SEED_ENABLED=true`
  ```yaml
  # application-dev.yml
  app:
    seed:
      enabled: ${SEED_ENABLED:false}
  ```
- MUST annotate the seeder with `@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")`
- MUST provide seed data for reference/lookup tables only: `skills`, `plans`
- MUST place raw seed SQL files in `src/main/resources/db/seed/` if loading from files, or define seed data as constants in the `DataSeeder` class
- MUST make all seed operations idempotent — use `INSERT ... ON CONFLICT DO NOTHING` or check existence before inserting via Repository
- MUST NOT seed user accounts with real passwords — MUST use placeholder BCrypt hashes
- MUST NOT run the seeder in production — MUST enforce via profile restriction (`@Profile("dev")` or `@Profile("test")`)
- MUST log all seed operations at `INFO` level: number of records inserted/skipped per table
- MUST execute the seeder AFTER Flyway migrations have completed (Spring Boot guarantees this by default)

## Query Rules

- MUST use parameterized queries for all database access — MUST NOT concatenate user input into SQL strings
- MUST use pagination for all list/search endpoints — MUST NOT return unbounded result sets
- MUST set a maximum page size (e.g., 100) — MUST NOT allow clients to request unlimited rows
- MUST use `SELECT` with explicit column lists in performance-critical queries — MUST NOT use `SELECT *` outside of development

## Connection Pool

- MUST use HikariCP as the connection pool (Spring Boot default)
- MUST configure `maximum-pool-size` based on expected load — MUST NOT leave it at the default of 10 for production
- MUST set `connection-timeout` to a reasonable value (e.g., 30000ms)
- MUST set `idle-timeout` and `max-lifetime` to prevent stale connections

## Database Testing (Testcontainers)

### Setup

- MUST use **Testcontainers** with a PostgreSQL + pgvector Docker image for all database integration tests
- MUST use the `pgvector/pgvector:pg16` (or matching version) Docker image — MUST NOT use plain `postgres` image since it lacks the `vector` extension
- MUST define a shared abstract test base class (e.g., `AbstractDatabaseTest`) that configures the Testcontainers PostgreSQL instance once per test suite
- MUST configure the test container to start before Spring context loads using `@Testcontainers` + `@DynamicPropertySource`:
  ```java
  @Testcontainers
  @SpringBootTest
  abstract class AbstractDatabaseTest {

      @Container
      static PostgreSQLContainer<?> postgres =
          new PostgreSQLContainer<>("pgvector/pgvector:pg16")
              .withDatabaseName("testdb")
              .withUsername("test")
              .withPassword("test");

      @DynamicPropertySource
      static void configureProperties(DynamicPropertyRegistry registry) {
          registry.add("spring.datasource.url", postgres::getJdbcUrl);
          registry.add("spring.datasource.username", postgres::getUsername);
          registry.add("spring.datasource.password", postgres::getPassword);
          registry.add("spring.flyway.enabled", () -> true);
      }
  }
  ```
- MUST NOT use H2 or any in-memory database for integration tests — MUST test against real PostgreSQL to catch dialect and extension differences

### Migration Testing

- MUST verify that all Flyway migrations apply cleanly on a fresh database as part of CI
- MUST include a dedicated migration test class (e.g., `FlywayMigrationTest`) that starts the container and runs `Flyway.migrate()` — the test passes if no exceptions are thrown
- MUST fail the build if any migration contains syntax errors or conflicts

### Repository / Integration Tests

- MUST extend `AbstractDatabaseTest` for all Repository and Service integration tests
- MUST use `@Transactional` on test classes to auto-rollback after each test — keeps tests isolated
- MUST NOT depend on test execution order — each test MUST set up its own required data
- MUST test soft-delete behavior: verify that soft-deleted records are excluded by default queries
- MUST test pgvector operations: verify that embedding insert and cosine similarity search work correctly

### Seed Testing

- MUST include a test that runs the `DataSeeder` twice and verifies idempotency — no duplicate records, no exceptions
- MUST verify that all expected reference data exists after seeding (e.g., assert skill count, plan count)

### Test Data Factories

- MUST create a `TestDataFactory` utility class that provides builder methods for creating test entities (e.g., `TestDataFactory.aUser()`, `TestDataFactory.aJob()`)
- MUST NOT copy-paste entity construction across test files — MUST use the factory
- MUST generate unique values for constrained fields (e.g., random UUID, unique email) to avoid conflicts between tests