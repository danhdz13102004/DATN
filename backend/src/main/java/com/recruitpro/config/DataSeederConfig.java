package com.recruitpro.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

@Slf4j
@Configuration
@Profile({"dev", "test","prod"})
public class DataSeederConfig {

    @Bean
    public CommandLineRunner dataSeeder(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
        return args -> {
            log.info("=== DataSeeder: Starting seed operation ===");
            seedAdminUser(jdbcTemplate, passwordEncoder);
            seedSkills(jdbcTemplate);
            seedPlans(jdbcTemplate);
            log.info("=== DataSeeder: Seed operation complete ===");
        };
    }

    private void seedAdminUser(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
        String email = "admin@gmail.com";
        int count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE email = ? AND deleted_at IS NULL",
            Integer.class,
            email
        );

        if (count > 0) {
            jdbcTemplate.update(
                """
                UPDATE users
                SET updated_at = created_at
                WHERE email = ? AND deleted_at IS NULL AND updated_at IS NULL
                """,
                email
            );
            log.info("DataSeeder: Admin account {} already exists, skipping", email);
            return;
        }

        jdbcTemplate.update(
            """
            INSERT INTO users (
                id, email, password_hash, role, full_name, status, email_verified_at, created_at, updated_at
            ) VALUES (
                ?, ?, ?, CAST(? AS user_role), ?, CAST(? AS user_status),
                NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC'
            )
            """,
            UUID.randomUUID(),
            email,
            passwordEncoder.encode("12345678"),
            "ADMIN",
            "Admin",
            "ACTIVE"
        );

        log.info("DataSeeder: Admin account {} inserted", email);
    }

    private void seedSkills(JdbcTemplate jdbcTemplate) {
        String[] skills = {
            "Java", "Python", "JavaScript", "TypeScript", "React", "Angular", "Vue.js",
            "Spring Boot", "Node.js", "Django", "FastAPI", "PostgreSQL", "MySQL",
            "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "Azure", "GCP",
            "Git", "CI/CD", "REST API", "GraphQL", "Machine Learning",
            "Data Science", "DevOps", "Linux", "Agile", "Scrum",
            "HTML", "CSS", "Tailwind CSS", "Bootstrap", "Figma",
            "Swift", "Kotlin", "Flutter", "React Native", "Go",
            "Rust", "C++", "C#", ".NET", "PHP", "Laravel", "Ruby", "Rails",
            "Elasticsearch", "Apache Kafka", "RabbitMQ", "Microservices"
        };

        int inserted = 0;
        for (String name : skills) {
            int affected = jdbcTemplate.update(
                "INSERT INTO skills (id, name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING",
                UUID.randomUUID(), name
            );
            inserted += affected;
        }
        log.info("DataSeeder: Skills — {} inserted, {} skipped", inserted, skills.length - inserted);
    }

    private void seedPlans(JdbcTemplate jdbcTemplate) {
        Object[][] plans = {
            {"Free", 0, 3, false, 0, 30},
            {"Pro", 20, 20, true, 20, 30},
            {"Premium", 100, 100, true, 100, 30},
        };

        int inserted = 0;
        for (Object[] plan : plans) {
            int count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM plans WHERE name = ?",
                Integer.class,
                plan[0]
            );
            if (count == 0) {
                jdbcTemplate.update(
                    "INSERT INTO plans (id, name, price, job_post_limit, allow_use_ai_matching, auto_fill_limit, duration_days, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW() AT TIME ZONE 'UTC')",
                    UUID.randomUUID(), plan[0], plan[1], plan[2], plan[3], plan[4], plan[5]
                );
                inserted++;
            }
        }
        log.info("DataSeeder: Plans — {} inserted, {} skipped", inserted, plans.length - inserted);
    }
}
