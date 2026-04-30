package com.recruitpro.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@Profile({"dev", "test"})
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DataSeeder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        log.info("=== DataSeeder: Starting seed operation ===");
        seedSkills();
        seedPlans();
        log.info("=== DataSeeder: Seed operation complete ===");
    }

    private void seedSkills() {
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

    private void seedPlans() {
        Object[][] plans = {
            {"Free", 0.00, 3, 30},
            {"Pro", 20, 20, 30},
            {"Premium", 100, 0, 30},
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
                    "INSERT INTO plans (id, name, price, job_post_limit, duration_days, created_at) VALUES (?, ?, ?, ?, ?, NOW() AT TIME ZONE 'UTC')",
                    UUID.randomUUID(), plan[0], plan[1], plan[2], plan[3]
                );
                inserted++;
            }
        }
        log.info("DataSeeder: Plans — {} inserted, {} skipped", inserted, plans.length - inserted);
    }
}
