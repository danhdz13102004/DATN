# Spring Framework Learning Plan — RecruitPro Backend
> A structured guide from **simple → advanced**, anchored to real code in this project.
> Every topic includes **what it is**, **why it matters**, and **where it appears** in the codebase.

---

## How to Use This Plan
1. Follow the phases in order — each phase builds on the previous one.
2. Find the referenced files in `backend/src/main/java/com/recruitpro/` and read them while studying.
3. Don't just read — modify small things, break them, then fix them.

---

## Phase 1 — Spring Boot Fundamentals

### 1.1 What Is Spring Boot?
Spring Boot is an opinionated layer on top of the Spring Framework. It auto-configures common components (web server, database, security, etc.) so you write almost zero boilerplate setup XML.

**Key idea:** Convention over configuration. If you add `spring-boot-starter-web` to `pom.xml`, Spring Boot automatically starts an embedded Tomcat server on port 8080 — no extra code needed.

**In this project:**
- `pom.xml` — parent is `spring-boot-starter-parent` 3.2.3. All starter versions are managed here.
- `RecruitProApplication.java` — the single entry point.

---

### 1.2 `@SpringBootApplication` — The Entry Point
```java
@SpringBootApplication
public class RecruitProApplication {
    public static void main(String[] args) {
        SpringApplication.run(RecruitProApplication.class, args);
    }
}
```
`@SpringBootApplication` is a shortcut for three annotations combined:
- `@SpringBootConfiguration` — marks this as a Spring configuration class.
- `@EnableAutoConfiguration` — tells Spring Boot to auto-configure everything it can find on the classpath.
- `@ComponentScan` — scans the current package and all sub-packages for Spring-managed beans.

**File:** `RecruitProApplication.java`

---

### 1.3 `application.yml` — Externalized Configuration
Spring Boot reads `src/main/resources/application.yml` at startup. You can override any value with environment variables or Docker secrets.

**Key patterns used in this project:**
```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/recruitpro}
```
- `${ENV_VAR:default}` — reads from environment variable, falls back to default if not set.
- This makes the same binary deployable in dev, staging, and production without code changes.

Separate profile files (`application-dev.yml`) override specific values when that profile is active.

**Files:** `src/main/resources/application.yml`, `application-dev.yml`

---

### 1.4 Starters — Managing Dependencies
Instead of listing dozens of individual libraries, you add one starter that pulls in a curated, compatible set. In `pom.xml`:

| Starter | What it enables |
|---|---|
| `spring-boot-starter-web` | REST controllers, embedded Tomcat, Jackson JSON |
| `spring-boot-starter-data-jpa` | Hibernate ORM, Spring Data JPA repositories |
| `spring-boot-starter-security` | Authentication, authorization filter chain |
| `spring-boot-starter-validation` | Bean Validation (JSR-380) with Hibernate Validator |
| `spring-boot-starter-data-redis` | Redis connection, `RedisTemplate` |
| `spring-boot-starter-mail` | `JavaMailSender` for sending emails |
| `spring-boot-starter-actuator` | `/actuator/health`, metrics, info endpoints |
| `spring-boot-starter-webflux` | Reactive `WebClient` for non-blocking HTTP calls |
| `spring-boot-starter-websocket` | STOMP over WebSocket support |

**File:** `pom.xml`

---

## Phase 2 — Spring IoC Container & Dependency Injection

### 2.1 The Core Idea: Inversion of Control
Normally, your code creates objects with `new`. With IoC, the Spring container creates and manages objects (called **beans**) and injects them where needed. You describe *what* you need; Spring figures out *how* to provide it.

---

### 2.2 Stereotype Annotations — Declaring Beans
These annotations tell Spring to create a managed instance of the class:

| Annotation | Semantic meaning | Where in project |
|---|---|---|
| `@Component` | Generic Spring-managed class | `JwtChannelInterceptor`, `DataSeeder` |
| `@Service` | Business logic layer | All classes in `service/` |
| `@Repository` | Data access layer (also enables exception translation) | All interfaces in `repository/` |
| `@Controller` | Web layer for MVC views | `ChatMessageHandler` |
| `@RestController` | `@Controller` + `@ResponseBody` for REST APIs | All classes in `controller/` |
| `@Configuration` | Defines `@Bean` factory methods | All classes in `config/` |

**Example:**
```java
@Service          // ← registers AuthService as a bean
@RequiredArgsConstructor  // ← Lombok: generates constructor with all final fields
public class AuthService {
    private final UserRepository userRepository; // ← injected automatically
    private final PasswordEncoder passwordEncoder;
    ...
}
```

---

### 2.3 Dependency Injection — Three Ways
Spring can inject dependencies in three ways. This project uses **constructor injection exclusively** (the recommended modern approach):

1. **Constructor injection** (used everywhere here):
   ```java
   @RequiredArgsConstructor  // Lombok generates: public AuthService(UserRepository r, ...) {}
   public class AuthService {
       private final UserRepository userRepository;
   }
   ```
   - Fields are `final` → immutable after construction → thread-safe.
   - Makes dependencies explicit and easy to test.

2. **Field injection** (avoid this):
   ```java
   @Autowired  // Not used in this project — bad practice
   private UserRepository userRepository;
   ```

3. **Setter injection** (used for optional dependencies — not in this project).

---

### 2.4 `@Configuration` + `@Bean` — Manual Bean Definitions
When Spring can't auto-detect a class (e.g., it's a third-party class), you define a `@Bean` method inside a `@Configuration` class:

```java
@Configuration
public class RedisConfig {

    @Bean  // ← the return value of this method becomes a Spring-managed bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        return new StringRedisTemplate(connectionFactory);
        // connectionFactory is auto-injected by Spring (it was auto-configured by the Redis starter)
    }
}
```

**Files:** `RedisConfig.java`, `AiServiceConfig.java`, `WebSocketConfig.java`, `SecurityConfig.java`

---

### 2.5 `@Qualifier` — Choosing Between Multiple Beans of the Same Type
When two beans have the same type, you need to tell Spring which one to inject:

```java
// Definition: two RestTemplate beans
@Bean(name = "aiRestTemplate")
public RestTemplate aiRestTemplate() { ... }

// Usage: select by name
public AiServiceClient(@Qualifier("aiRestTemplate") RestTemplate restTemplate, ...) {
    this.restTemplate = restTemplate;
}
```

**File:** `AiServiceConfig.java`, `AiServiceClient.java`

---

### 2.6 `@Value` — Injecting Configuration Values
Injects a value from `application.yml` or environment variables directly into a field:

```java
@Value("${app.cors.allowed-origins}")
private String allowedOrigins;

@Value("${app.ai-service.url:http://ai-service:8000}")  // ":" sets a default
private String aiServiceUrl;
```

**Files:** `SecurityConfig.java`, `WebSocketConfig.java`, `AiServiceConfig.java`, `StorageService.java`

---

### 2.7 `@PostConstruct` — Initialization Hook
Runs once after the bean is fully constructed and all `@Value` fields are injected. Used for setup that requires injected values:

```java
@Service
public class StorageService {
    @Value("${app.minio.endpoint}")
    private String endpoint;

    private S3Client s3Client;

    @PostConstruct
    public void init() {           // ← runs after endpoint is injected
        URI endpointUri = URI.create(endpoint);
        this.s3Client = S3Client.builder()
                .endpointOverride(endpointUri)
                ...
                .build();
    }
}
```

**File:** `StorageService.java`

---

## Phase 3 — Spring MVC / REST API

### 3.1 The Request-Response Cycle
```
HTTP Request → DispatcherServlet → @RestController → @Service → @Repository → DB
                                                                              ↓
HTTP Response ← DispatcherServlet ← ResponseEntity ←  Result ←─────────────
```
Spring MVC's `DispatcherServlet` is the front controller that routes every request to the correct controller method.

---

### 3.2 `@RestController` and `@RequestMapping`
```java
@RestController                    // returns JSON, not HTML views
@RequestMapping("/api/v1/auth")    // base path for all methods in this class
public class AuthController {
    ...
}
```

**All controllers in `controller/`** follow this pattern.

---

### 3.3 HTTP Method Annotations
Map specific HTTP verbs to handler methods:

| Annotation | HTTP Verb | Typical use |
|---|---|---|
| `@GetMapping` | GET | Read data |
| `@PostMapping` | POST | Create data |
| `@PutMapping` | PUT | Replace data |
| `@PatchMapping` | PATCH | Partially update |
| `@DeleteMapping` | DELETE | Delete data |

```java
@PostMapping("/login")
public ResponseEntity<ApiResponse<AuthResponseDto>> login(
        @RequestBody @Valid LoginRequestDto request) {
    ...
}
```

---

### 3.4 Parameter Binding Annotations

| Annotation | Source | Example |
|---|---|---|
| `@RequestBody` | JSON body | `@RequestBody LoginRequestDto request` |
| `@PathVariable` | URL path segment | `@PathVariable UUID id` |
| `@RequestParam` | Query string `?key=val` | `@RequestParam String keyword` |
| `@RequestHeader` | HTTP header | Not used directly here (JWT headers are read in the filter) |

```java
// GET /api/v1/jobs?keyword=java&jobType=FULL_TIME&page=1
@GetMapping
public ResponseEntity<...> listPublished(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) JobType jobType,
        @PageableDefault(size = 20) Pageable pageable
) { ... }

// GET /api/v1/jobs/550e8400-e29b-41d4-a716-446655440000
@GetMapping("/{id}")
public ResponseEntity<...> getById(@PathVariable UUID id) { ... }
```

**Files:** `JobController.java`, `AuthController.java`

---

### 3.5 `ResponseEntity` — Controlling the HTTP Response
Wraps the response body and lets you set the status code and headers:

```java
return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data));
return ResponseEntity.ok(ApiResponse.ok(data));               // 200 OK
return ResponseEntity.status(HttpStatus.NOT_FOUND).body(...); // 404
```

This project wraps every response in a generic `ApiResponse<T>` record that includes status, data, and error information — a consistent API contract.

---

### 3.6 Pagination with `Pageable` and `Page`
Spring MVC automatically converts query parameters `page`, `size`, and `sort` into a `Pageable` object:

```java
// Client: GET /api/v1/jobs?page=2&size=10&sort=createdAt,desc
@GetMapping
public ResponseEntity<...> list(@PageableDefault(size = 20) Pageable pageable) {
    Page<Job> page = jobService.findPublishedJobs(..., pageable);
    // page.getContent()       → list of items
    // page.getTotalElements() → total count
    // page.getTotalPages()    → total pages
}
```

`application.yml` enables 1-indexed pages (`one-indexed-parameters: true`) so page 1 is the first page.

**Files:** `JobController.java`, `JobRepository.java`, `NotificationService.java`

---

### 3.7 Bean Validation — `@Valid` and Constraint Annotations
`spring-boot-starter-validation` integrates JSR-380 (Bean Validation 2.0) with Spring MVC. Add `@Valid` to a `@RequestBody` and Spring automatically validates all constraints before calling your method.

```java
// DTO:
public class LoginRequestDto {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 6)
    private String password;
}

// Controller:
@PostMapping("/login")
public ResponseEntity<...> login(@RequestBody @Valid LoginRequestDto request) {
    // if validation fails, Spring throws MethodArgumentNotValidException BEFORE reaching here
}
```

The `GlobalExceptionHandler` catches `MethodArgumentNotValidException` and returns a `400 Bad Request` with field-level error messages.

**Files:** `AuthController.java`, `GlobalExceptionHandler.java`

---

### 3.8 `@ControllerAdvice` + `@ExceptionHandler` — Global Exception Handling
Instead of wrapping every service call in try-catch, you define one class that handles exceptions from ALL controllers:

```java
@ControllerAdvice                  // ← applied globally to all @Controller classes
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)   // ← handles this exception type
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("NOT_FOUND", ex.getMessage()));
    }
}
```

**Exceptions handled in this project:**

| Exception class | HTTP status |
|---|---|
| `ResourceNotFoundException` | 404 Not Found |
| `DuplicateResourceException` | 409 Conflict |
| `UnauthorizedException` | 401 Unauthorized |
| `ForbiddenException` | 403 Forbidden |
| `BadRequestException` | 400 Bad Request |
| `MethodArgumentNotValidException` | 400 (validation) |
| `RateLimitException` | 429 Too Many Requests |
| `AiServiceException` | 503 Service Unavailable |

**File:** `GlobalExceptionHandler.java`, `exception/`

---

## Phase 4 — Spring Data JPA (Database Layer)

### 4.1 ORM Basics — Entity Mapping
JPA (Java Persistence API) maps Java objects to database tables. Hibernate is the implementation used here.

```java
@Entity              // ← this class maps to a database table
@Table(name = "users")
public class User {

    @Id                                    // ← primary key
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Enumerated(EnumType.STRING)           // ← store enum as string in DB
    @Column(nullable = false, columnDefinition = "user_role")
    private UserRole role;
}
```

**Files:** All files in `model/`

---

### 4.2 JPA Annotations Deep Dive

| Annotation | Purpose |
|---|---|
| `@Entity` | Marks class as a JPA entity (mapped to a table) |
| `@Table(name = "...")` | Specifies the exact table name |
| `@Id` | Marks the primary key field |
| `@Column(...)` | Customizes column mapping (name, nullable, unique, etc.) |
| `@Enumerated(EnumType.STRING)` | Stores enum values as their string name |
| `@JdbcTypeCode(SqlTypes.NAMED_ENUM)` | Hibernate hint for PostgreSQL custom enum types |
| `@JdbcTypeCode(SqlTypes.JSON)` | Maps field to a JSONB column in PostgreSQL |
| `@JdbcTypeCode(SqlTypes.ARRAY)` | Maps field to a PostgreSQL text array column |
| `@PrePersist` | Callback method that runs before `INSERT` |
| `@PreUpdate` | Callback method that runs before `UPDATE` |
| `@SQLRestriction("deleted_at IS NULL")` | Adds a WHERE clause to ALL queries for soft-delete |

**Files:** `User.java`, `Job.java`, and all model classes.

---

### 4.3 Entity Relationships

**`@ManyToOne`** — Many jobs belong to one industry:
```java
// In Job.java:
@ManyToOne(fetch = FetchType.EAGER)   // EAGER: load Industry immediately with Job
@JoinColumn(name = "industry_id")     // foreign key column name
private Industry industry;
```

**`@ManyToMany`** — Jobs have many skills; skills belong to many jobs:
```java
// In Job.java:
@ManyToMany(fetch = FetchType.LAZY)   // LAZY: load skills only when accessed
@JoinTable(
    name = "job_skills",              // join/pivot table name
    joinColumns = @JoinColumn(name = "job_id"),
    inverseJoinColumns = @JoinColumn(name = "skill_id")
)
private Set<Skill> skills;
```

**`@ElementCollection`** — Stores a collection of simple values (not entities):
```java
// In Job.java (experience levels stored in a separate table):
@ElementCollection(fetch = FetchType.EAGER)
@CollectionTable(name = "job_experience_levels", joinColumns = @JoinColumn(name = "job_id"))
@Column(name = "level", columnDefinition = "experience_level")
private Set<ExperienceLevel> experienceLevels;
```

**Fetch types explained:**
- `FetchType.EAGER` — loads the related data in the same SQL query (1 query, more data).
- `FetchType.LAZY` — loads related data only when you access the field (can cause N+1 query problems if not careful).

**File:** `Job.java`, `Application.java`, `User.java`

---

### 4.4 Spring Data JPA Repositories
Instead of writing DAO classes manually, you extend `JpaRepository` and Spring generates the implementation:

```java
@Repository
public interface JobRepository extends JpaRepository<Job, UUID> {
    // JpaRepository<EntityType, PrimaryKeyType>
    // Out of the box: save(), findById(), findAll(), delete(), count(), etc.
}
```

---

### 4.5 Derived Query Methods
Spring Data reads method names and generates the SQL automatically:

```java
Page<Job> findAllByCompanyId(UUID companyId, Pageable pageable);
// → SELECT * FROM jobs WHERE company_id = ? AND deleted_at IS NULL ORDER BY ... LIMIT ? OFFSET ?

long countByStatus(JobStatus status);
// → SELECT COUNT(*) FROM jobs WHERE status = ?

List<Job> findTop10ByCompanyIdAndStatusOrderByCreatedAtDesc(UUID companyId, JobStatus status);
// → SELECT * FROM jobs WHERE company_id = ? AND status = ? ORDER BY created_at DESC LIMIT 10

boolean existsByEmail(String email);   // in UserRepository
// → SELECT COUNT(*) > 0 FROM users WHERE email = ?
```

**Keyword reference:** `findBy`, `countBy`, `existsBy`, `deleteBy`, `And`, `Or`, `OrderBy`, `Top`, `Distinct`, `In`, `Like`, `Between`, `LessThan`, `GreaterThan`.

---

### 4.6 Custom JPQL Queries with `@Query`
When derived methods aren't expressive enough, write JPQL (Java Persistence Query Language):

```java
@Query("SELECT DISTINCT j FROM Job j WHERE j.status = 'PUBLISHED' AND " +
       "(cast(:keyword as string) IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', cast(:keyword as string), '%'))) AND " +
       "(cast(:jobType as string) IS NULL OR j.jobType = :jobType)")
Page<Job> findPublishedJobs(
        @Param("keyword") String keyword,   // ← binds method param to :keyword in the query
        @Param("jobType") JobType jobType,
        Pageable pageable
);
```

JPQL differences from SQL:
- Uses class names and field names (`Job`, `j.title`), not table/column names.
- `cast(:param as string) IS NULL` is a JPQL trick to handle optional parameters.

**File:** `JobRepository.java`, `NotificationRepository.java`

---

### 4.7 `@Transactional` — Database Transaction Management
Ensures that all database operations in a method either all succeed or all roll back together:

```java
@Transactional          // ← if ANY exception is thrown, all DB changes are rolled back
public void register(RegisterRequestDto request) {
    User user = userRepository.save(user);          // operation 1
    Company company = companyRepository.save(co);   // operation 2  — both succeed or both fail
    Staff staff = staffRepository.save(st);         // operation 3
}

@Transactional(readOnly = true)   // ← optimization hint: Hibernate skips dirty-checking
public Page<NotificationDto> list(UUID userId, int page, int size) {
    return notificationRepository.findByUserIdOrderByCreatedAtDesc(...)
}
```

**Rule:** Every `@Service` method that writes to the database should be `@Transactional`. Read-only methods should use `@Transactional(readOnly = true)`.

**Files:** `AuthService.java`, `NotificationService.java`, `ApplicationService.java`

---

### 4.8 Flyway — Database Migration Management
Instead of manually running SQL scripts, Flyway tracks which scripts have run and applies new ones automatically at startup.

```
src/main/resources/db/migration/
├── V1__create_extensions.sql        ← ran first
├── V2__create_enum_types.sql
├── V3__create_users_table.sql
...
└── V39__add_json_matching_to_applications.sql  ← ran last
```

Naming rule: `V{version}__{description}.sql`. Version numbers must increase monotonically. Once applied, a migration file must NEVER be modified — only add new ones.

**Config in `application.yml`:**
```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
```

---

## Phase 5 — Spring Security

### 5.1 The Security Filter Chain
Spring Security works as a chain of Servlet filters that intercept every request before it reaches a controller. In `SecurityConfig.java`, you configure which endpoints require authentication and which are public.

---

### 5.2 `@EnableWebSecurity` + `SecurityFilterChain`
```java
@Configuration
@EnableWebSecurity       // activates Spring Security's web support
@EnableMethodSecurity    // enables @PreAuthorize, @PostAuthorize on methods
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)          // disabled because we use JWT (stateless)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)  // no HTTP sessions
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()  // public
                .requestMatchers(HttpMethod.GET, "/api/v1/jobs/**").permitAll()
                .anyRequest().authenticated()                    // everything else requires auth
            )
            .addFilterBefore(jwtAuthenticationFilter,
                    UsernamePasswordAuthenticationFilter.class); // add our JWT filter
        return http.build();
    }
}
```

**File:** `SecurityConfig.java`

---

### 5.3 Stateless JWT Authentication
This project does NOT use sessions (cookies). Instead:
1. Client logs in → server returns a JWT access token + refresh token.
2. Client sends `Authorization: Bearer <token>` with every request.
3. A custom filter validates the JWT and sets up the `SecurityContext`.

**The custom filter — `JwtAuthenticationFilter`:**
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    // OncePerRequestFilter guarantees the filter runs exactly ONCE per request

    @Override
    protected void doFilterInternal(HttpServletRequest request, ...) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            Optional<Claims> claims = jwtUtil.parseToken(token);

            claims.ifPresent(c -> {
                // Build a principal object from the JWT claims
                UserPrincipal principal = UserPrincipal.builder()
                        .id(jwtUtil.getSubject(c))
                        .role(jwtUtil.getRole(c))
                        .build();

                // Tell Spring Security "this request is authenticated as this principal"
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            });
        }
        filterChain.doFilter(request, response);  // always pass request to next filter
    }
}
```

**File:** `JwtAuthenticationFilter.java`

---

### 5.4 `SecurityContextHolder` — The Authentication Store
After the filter sets the authentication, any downstream code (service, controller) can retrieve the current user:

```java
// In controllers — Spring resolves this automatically from SecurityContext:
@GetMapping("/me")
public ResponseEntity<...> getProfile(
        @AuthenticationPrincipal UserPrincipal principal) {
    // principal is the UserPrincipal object we set in JwtAuthenticationFilter
    UUID userId = UUID.fromString(principal.getId());
}
```

`@AuthenticationPrincipal` is a shortcut that extracts the principal from `SecurityContextHolder.getContext().getAuthentication().getPrincipal()`.

---

### 5.5 Password Encoding with `BCryptPasswordEncoder`
Passwords must NEVER be stored in plain text. BCrypt is a one-way hash that is intentionally slow:

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();  // defined in SecurityConfig
}

// Usage in AuthService:
user.setPasswordHash(passwordEncoder.encode(rawPassword));   // on registration
passwordEncoder.matches(rawPassword, user.getPasswordHash()); // on login
```

---

### 5.6 CORS Configuration
Cross-Origin Resource Sharing — browsers block requests from `http://localhost:3000` to `http://localhost:8080` by default. Spring Security configures CORS:

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

**File:** `SecurityConfig.java`

---

### 5.7 `@EnableMethodSecurity` — Securing Individual Methods
With `@EnableMethodSecurity`, you can add security rules on service or controller methods:

```java
@PreAuthorize("hasRole('ADMIN')")  // only users with ROLE_ADMIN can call this
public void deleteUser(UUID userId) { ... }

@PreAuthorize("hasRole('COMPANY') or hasRole('ADMIN')")
public JobDto createJob(JobCreateDto dto) { ... }
```

This project enables this via `@EnableMethodSecurity` in `SecurityConfig.java`.

---

## Phase 6 — Spring Data Redis

### 6.1 Why Redis?
Redis is an in-memory key-value store used in this project for:
1. **Caching** — store frequently read data (e.g., job details) to avoid hitting PostgreSQL every time.
2. **Session storage** — JWT refresh tokens are stored in Redis with TTL.
3. **Rate limiting** — OTP resend counters stored with TTL.
4. **Pub/Sub messaging** — real-time chat and notification events between instances.

---

### 6.2 `StringRedisTemplate`
The main interface for interacting with Redis. `StringRedisTemplate` serializes keys and values as plain strings (vs. `RedisTemplate<Object, Object>` which uses Java serialization):

```java
@Configuration
public class RedisConfig {
    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory factory) {
        return new StringRedisTemplate(factory);
    }
}
```

**File:** `RedisConfig.java`

---

### 6.3 `CacheService` — Abstraction over Raw Redis
This project wraps all Redis access behind a `CacheService` so that the key naming conventions and TTL rules are enforced in one place:

```java
@Service
public class CacheService {
    private final StringRedisTemplate redisTemplate;

    public Optional<String> get(String key) {
        return Optional.ofNullable(redisTemplate.opsForValue().get(key));
    }

    public void set(String key, String value, long ttl, TimeUnit timeUnit) {
        redisTemplate.opsForValue().set(key, value, ttl, timeUnit);
    }

    public boolean setIfAbsent(String key, String value, long ttl, TimeUnit timeUnit) {
        // Used for distributed locks / OTP rate limiting
        return Boolean.TRUE.equals(redisTemplate.opsForValue().setIfAbsent(key, value, ttl, timeUnit));
    }
}
```

**Key naming pattern:** Always use namespaced keys like `"refresh_token:{userId}"`, `"job:detail:{id}"`, `"otp:rate:{email}"`.

**File:** `CacheService.java`

---

### 6.4 Redis Pub/Sub — Real-Time Messaging
Redis Pub/Sub lets different instances of the backend broadcast messages to each other. This powers the real-time chat and notification systems:

**Publisher** — sends an event:
```java
@Service
public class RedisPublisher {
    private final StringRedisTemplate template;
    private final ObjectMapper objectMapper;

    public void publish(String channel, Object event) {
        String json = objectMapper.writeValueAsString(event);
        template.convertAndSend(channel, json);   // broadcasts to all subscribers
    }
}
```

**Subscriber** — receives events and forwards them to WebSocket clients:
```java
@Component
public class NotificationRedisSubscriber implements MessageListener {
    // Registered for pattern "redis:channel:notification:*" in RedisPubSubConfig

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String body = new String(message.getBody());
        NotificationEvent event = objectMapper.readValue(body, NotificationEvent.class);
        // send to the connected WebSocket client
        messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", event);
    }
}
```

**Listener registration** in `RedisPubSubConfig.java`:
```java
@Bean
public RedisMessageListenerContainer redisMessageListenerContainer() {
    RedisMessageListenerContainer container = new RedisMessageListenerContainer();
    container.setConnectionFactory(connectionFactory);
    container.addMessageListener(notificationSubscriber, new PatternTopic("redis:channel:notification:*"));
    container.addMessageListener(chatSubscriber,         new PatternTopic("redis:channel:chat:*"));
    return container;
}
```

**Files:** `RedisPublisher.java`, `NotificationRedisSubscriber.java`, `ChatRedisSubscriber.java`, `RedisPubSubConfig.java`

---

## Phase 7 — Spring WebSocket / STOMP

### 7.1 WebSocket vs. HTTP
HTTP is request-response: the client asks, the server answers, connection closes. WebSocket is a persistent bidirectional connection: either side can send a message at any time — essential for real-time chat and live notifications.

STOMP (Simple Text Oriented Messaging Protocol) is a messaging protocol that runs over WebSocket, adding concepts like channels, subscriptions, and destinations.

---

### 7.2 `@EnableWebSocketMessageBroker` Configuration
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");   // server→client destinations
        config.setApplicationDestinationPrefixes("/app"); // client→server destinations
        config.setUserDestinationPrefix("/user");          // per-user private destinations
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns(...).withSockJS();  // with fallback
        registry.addEndpoint("/ws-native").setAllowedOriginPatterns(...);         // pure WebSocket
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtChannelInterceptor);  // validate JWT on CONNECT
    }
}
```

**Destination prefixes explained:**
- Client sends to `/app/chat.send` → Spring routes to `@MessageMapping("/chat.send")` method.
- Server broadcasts to `/topic/chat.{conversationId}` → all subscribers receive it.
- Server sends to `/user/{userId}/queue/notifications` → only that specific user receives it.

**File:** `WebSocketConfig.java`

---

### 7.3 `@MessageMapping` — WebSocket Message Handlers
Similar to `@RequestMapping` but for WebSocket messages instead of HTTP requests:

```java
@Controller    // NOT @RestController
public class ChatMessageHandler {

    @MessageMapping("/chat.send")   // client sends to: /app/chat.send
    public void handleSend(@Payload @Validated SendMessageRequest req, Principal principal) {
        // Principal is set by JwtChannelInterceptor during CONNECT
        UUID senderId = UUID.fromString(principal.getName());
        // ... process and publish via Redis Pub/Sub
    }
}
```

**File:** `ChatMessageHandler.java`

---

### 7.4 `ChannelInterceptor` — WebSocket Security
HTTP requests have `OncePerRequestFilter`. WebSocket has `ChannelInterceptor`. The `JwtChannelInterceptor` validates JWT tokens during the WebSocket `CONNECT` frame:

```java
@Component
public class JwtChannelInterceptor implements ChannelInterceptor {

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extractToken(accessor);  // from "Authorization" STOMP header
            Claims claims = jwtUtil.parseToken(token).orElseThrow(...);

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    userId, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))
            );
            accessor.setUser(auth);  // sets the Principal for this WebSocket session
        }
        return message;
    }
}
```

**File:** `JwtChannelInterceptor.java`

---

## Phase 8 — Spring Mail & Async

### 8.1 `JavaMailSender` — Sending Emails
The `spring-boot-starter-mail` auto-configures `JavaMailSender` from `application.yml`:

```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties.mail.smtp.starttls.enable: true
```

```java
@Service
public class EmailService {
    private final JavaMailSender mailSender;

    public void sendOtp(String to, String code, String purpose) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(to);
        message.setSubject("RecruitPro — Your verification code");
        message.setText("Your code is: " + code);
        mailSender.send(message);
    }
}
```

**File:** `EmailService.java`

---

### 8.2 `@Async` — Non-Blocking Method Execution
Sending email is slow (network I/O). With `@Async`, the method runs in a separate thread pool thread, so the HTTP request returns immediately without waiting for the email:

```java
// 1. Enable async in a config class:
@Configuration
@EnableAsync
public class AsyncConfig { }

// 2. Mark the slow method as async:
@Async
public void sendOtp(String to, String code, String purpose) {
    mailSender.send(message);  // runs in background thread, caller continues immediately
}

// 3. Also used in AiServiceClient — AI calls should never block user-facing requests:
@Async
public void addResumeNode(UUID resumeId, String text) {
    sendAddNode(resumeId.toString(), text, "resume");
}
```

**Important:** `@Async` only works when the method is called from OUTSIDE the same bean (Spring must proxy the call). Calling an `@Async` method from within the same class will NOT run it asynchronously.

**Files:** `AsyncConfig.java`, `EmailService.java`, `AiServiceClient.java`

---

## Phase 9 — Advanced Spring Boot Features

### 9.1 `@Profile` — Environment-Specific Beans
Activates a bean only when a specific profile is active:

```java
@Component
@Profile({"dev", "test"})          // only active when spring.profiles.active=dev or test
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")  // AND this property is true
public class DataSeeder implements CommandLineRunner {
    @Override
    public void run(String... args) {
        // seeds initial data at startup
    }
}
```

Active profile is set via `SPRING_PROFILES_ACTIVE=dev` environment variable or in `application.yml`.

**File:** `DataSeeder.java`

---

### 9.2 `CommandLineRunner` — Startup Hooks
`CommandLineRunner` is a functional interface whose `run()` method is called once after the Spring context is fully initialized. Used for data seeding, warm-up tasks, or startup validation:

```java
@Component
public class DataSeeder implements CommandLineRunner {
    @Override
    public void run(String... args) throws Exception {
        seedSkills();
        seedPlans();
    }
}
```

**File:** `DataSeeder.java`

---

### 9.3 `@ConditionalOnProperty` — Feature Flags
Conditionally includes a bean based on a property value. This is how the data seeder is disabled in production:

```java
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
// The bean is NOT created unless app.seed.enabled=true in application.yml
```

**File:** `DataSeeder.java`

---

### 9.4 Spring Boot Actuator
`spring-boot-starter-actuator` adds production-ready monitoring endpoints:

| Endpoint | What it shows |
|---|---|
| `/actuator/health` | Application health status |
| `/actuator/info` | Application info |
| `/actuator/metrics` | JVM, HTTP, datasource metrics |
| `/actuator/env` | Environment properties |

In `SecurityConfig.java`, `/actuator/**` is permitted without authentication for health checks from Docker/Kubernetes.

---

### 9.5 HikariCP — Connection Pool Configuration
HikariCP is the default JDBC connection pool in Spring Boot. It maintains a pool of pre-opened database connections so you don't pay the cost of opening a new connection on every request:

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20       # max concurrent DB connections
      connection-timeout: 30000   # wait up to 30s for a connection from the pool
      idle-timeout: 600000        # close idle connections after 10 min
      max-lifetime: 1800000       # recycle connections after 30 min (avoids stale connections)
```

---

### 9.6 WebClient (Spring WebFlux) — Reactive HTTP Client
`spring-boot-starter-webflux` adds `WebClient`, a non-blocking, reactive alternative to `RestTemplate`. This project has the dependency but currently uses `RestTemplate` for the AI service client. `WebClient` is important to know for future reactive programming with Spring:

```java
// RestTemplate (blocking — used in this project):
ResponseEntity<Map> response = restTemplate.postForEntity(url, body, Map.class);

// WebClient (non-blocking — the modern approach):
Mono<Map> response = webClient.post()
        .uri(url)
        .bodyValue(body)
        .retrieve()
        .bodyToMono(Map.class);
```

**File:** `AiServiceClient.java`

---

### 9.7 `JdbcTemplate` — Low-Level SQL Execution
For cases where JPA is too heavy (bulk inserts, DDL, complex native SQL), `JdbcTemplate` provides direct SQL execution with Spring's exception translation:

```java
// In DataSeeder.java:
jdbcTemplate.update(
    "INSERT INTO skills (id, name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING",
    UUID.randomUUID(), name
);

Integer count = jdbcTemplate.queryForObject(
    "SELECT COUNT(*) FROM plans WHERE name = ?", Integer.class, planName
);
```

**File:** `DataSeeder.java`

---

## Phase 10 — Cross-Cutting Patterns in This Project

### 10.1 Layered Architecture
This project follows strict layering:
```
Controller → Service → Repository → Database
     ↓
  Exception (thrown upward)
     ↓
GlobalExceptionHandler (caught at the top)
```

- **Controllers** (`controller/`) — handle HTTP, validate input, call services.
- **Services** (`service/`) — contain business logic, manage transactions.
- **Repositories** (`repository/`) — data access only, no business logic.
- **Models** (`model/`) — JPA entities, pure data structures.
- **DTOs** (`dto/`) — request/response objects, never expose entity directly to API.

---

### 10.2 DTO Pattern — Never Expose Entities Directly
Entities are internal. DTOs are the API contract:
- `dto/request/` — what the client sends (e.g., `LoginRequestDto`, `RegisterRequestDto`).
- `dto/response/` — what the server returns (e.g., `AuthResponseDto`, `CompanyResponseDto`).

This decouples the API from the database schema, so you can change one without breaking the other.

---

### 10.3 Lombok — Reducing Boilerplate
Lombok is a compile-time annotation processor that generates code:

| Annotation | Generated code |
|---|---|
| `@Getter` | `getX()` for all fields |
| `@Setter` | `setX()` for all fields |
| `@NoArgsConstructor` | `MyClass()` |
| `@AllArgsConstructor` | `MyClass(field1, field2, ...)` |
| `@Builder` | Builder pattern: `MyClass.builder().field(val).build()` |
| `@RequiredArgsConstructor` | Constructor with all `final` fields (enables DI without `@Autowired`) |
| `@Slf4j` | `private static final Logger log = LoggerFactory.getLogger(...)` |

---

### 10.4 Soft Delete with `@SQLRestriction`
Instead of actually deleting records (which breaks foreign keys and audit history), rows are "soft deleted" by setting `deleted_at`:

```java
@Entity
@SQLRestriction("deleted_at IS NULL")   // Hibernate adds this to ALL generated queries
public class User {
    private Instant deletedAt;           // null = active, non-null = deleted
}
```

Every query automatically filters out soft-deleted records — you never need to add `AND deleted_at IS NULL` manually.

**Files:** `User.java`, `Job.java`, `Company.java`

---

## Learning Path Summary

| Phase | Topics | Difficulty |
|---|---|---|
| 1 | Spring Boot basics, `application.yml`, starters | ⭐ Beginner |
| 2 | IoC, DI, `@Bean`, `@Value`, `@PostConstruct` | ⭐⭐ Beginner+ |
| 3 | REST controllers, parameter binding, pagination, validation, exception handling | ⭐⭐ Beginner+ |
| 4 | JPA entities, relationships, repositories, JPQL, `@Transactional`, Flyway | ⭐⭐⭐ Intermediate |
| 5 | Spring Security, JWT filter, CORS, `@EnableMethodSecurity` | ⭐⭐⭐ Intermediate |
| 6 | Redis caching, Pub/Sub, `StringRedisTemplate` | ⭐⭐⭐ Intermediate |
| 7 | WebSocket, STOMP, `@MessageMapping`, `ChannelInterceptor` | ⭐⭐⭐⭐ Advanced |
| 8 | `JavaMailSender`, `@Async`, `@EnableAsync` | ⭐⭐⭐ Intermediate |
| 9 | Actuator, Profiles, `CommandLineRunner`, `@ConditionalOnProperty`, HikariCP, WebClient | ⭐⭐⭐⭐ Advanced |
| 10 | Architecture patterns: layers, DTOs, Lombok, soft delete | ⭐⭐ Conceptual |

---

## Suggested Study Order (Practical)
1. **Start here:** Read `RecruitProApplication.java` + `pom.xml` → understand what's included.
2. **Phase 2 + 3:** Read `AuthController.java` + `AuthService.java` → trace a login request end-to-end.
3. **Phase 4:** Read `User.java`, `JobRepository.java` → understand how data is stored and retrieved.
4. **Phase 5:** Read `SecurityConfig.java` + `JwtAuthenticationFilter.java` → understand how authentication works.
5. **Phase 6:** Read `CacheService.java` + `RedisPubSubConfig.java` → understand caching + pub/sub.
6. **Phase 7:** Read `WebSocketConfig.java` + `JwtChannelInterceptor.java` + `ChatMessageHandler.java` → follow a chat message end-to-end.
7. **Phase 8:** Read `EmailService.java` → understand `@Async`.
8. **Phase 9:** Read `DataSeeder.java` → understand profiles and startup hooks.
