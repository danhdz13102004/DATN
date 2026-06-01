#!/usr/bin/env python3
"""seed_graph.py — Insert synthetic data into PostgreSQL, then sync graph to AI service.

Phase 1 (DB):  Insert 5 companies, 200+ jobs (mostly IT/web-focused), 105+ job seekers,
               resumes, job_interactions, and applications into PostgreSQL.
Phase 2 (AI):  POST every job/resume as add_node, then POST every
               interaction as /interact (apply) or /interact/behavioral (click/save).

Usage:
    # Run both phases (default)
    python seed_graph.py

    # Only insert into DB (skip AI sync)
    python seed_graph.py --skip-sync

    # Custom endpoints
    python seed_graph.py --db-url postgresql://user:pass@localhost:5432/recruitpro \
                         --ai-url http://localhost:8000 --delay 0.05

Environment vars (used when --db-url is not given):
    POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
"""

import argparse
import json
import logging
import os
import random
import time
import uuid
from datetime import timezone, datetime

import psycopg2
import psycopg2.extras
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SEED = 42
random.seed(SEED)

# ── Bcrypt placeholder (pre-hashed "Password1!" — safe for dev/test) ──────────
_BCRYPT_PLACEHOLDER = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y"

# ── Skill Clusters: logical groups of related skills ─────────────────────────
SKILL_CLUSTERS = {
    # Frontend/UI
    "frontend_core": ["HTML", "CSS", "JavaScript", "TypeScript"],
    "react": ["React", "Redux", "Next.js", "Tailwind CSS", "Jest", "React Testing Library"],
    "vue": ["Vue.js", "Vue 3", "Pinia", "Nuxt.js", "Tailwind CSS", "Vitest"],
    "angular": ["Angular", "Angular Material", "NgRx", "TypeScript", "RxJS", "Jest"],
    "css_styling": ["CSS", "Sass", "Less", "Tailwind CSS", "Styled Components", "CSS Modules"],
    "animation": ["Framer Motion", "GSAP", "Three.js", "WebGL", "SVG Animation"],

    # Backend
    "nodejs": ["Node.js", "Express", "NestJS", "npm"],
    "python": ["Python", "FastAPI", "Django", "Flask"],
    "java": ["Java", "Spring Boot", "Spring MVC", "Spring Security", "Hibernate", "Maven", "Gradle"],
    "go": ["Go", "Gin", "Echo", "gRPC"],
    "rust": ["Rust", "Actix-web", "Tokio"],
    "php": ["PHP", "Laravel", "Symfony", "Composer"],
    "ruby": ["Ruby", "Ruby on Rails", "Sinatra", "ActiveRecord"],

    # Mobile
    "react_native": ["React Native", "TypeScript", "Redux", "Jest"],
    "flutter": ["Flutter", "Dart", "BLoC", "Firebase"],
    "ios": ["iOS", "Swift", "SwiftUI", "Xcode", "Objective-C"],
    "android": ["Android", "Kotlin", "Java", "Android Studio", "Jetpack Compose"],

    # Data/AI
    "ml_data": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy"],
    "data_eng": ["Python", "SQL", "Spark", "Airflow", "dbt", "Snowflake", "ETL", "Kafka"],
    "llm_ai": ["Python", "LLM", "LangChain", "OpenAI API", "Hugging Face", "RAG", "NLP"],
    "computer_vision": ["Python", "Computer Vision", "OpenCV", "TensorFlow", "PyTorch", "Deep Learning"],

    # Database
    "sql_db": ["PostgreSQL", "MySQL", "SQL", "Redis", "TypeORM", "Prisma"],
    "nosql_db": ["MongoDB", "Redis", "DynamoDB", "Firebase", "Cassandra"],
    "graph_db": ["Neo4j", "GraphQL"],

    # DevOps/Cloud
    "aws": ["AWS", "EC2", "S3", "Lambda", "ECS", "EKS", "RDS", "CloudFormation"],
    "gcp": ["GCP", "Compute Engine", "GKE", "BigQuery", "Cloud Storage", "Cloud Run"],
    "azure": ["Azure", "Azure Functions", "AKS", "Azure DevOps", "Cosmos DB"],
    "devops": ["Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins", "CI/CD", "GitHub Actions"],
    "monitoring": ["Prometheus", "Grafana", "ELK Stack"],

    # Tools & Practices
    "git_cicd": ["Git", "GitHub Actions", "GitLab CI", "Jenkins", "CI/CD", "ArgoCD"],
    "testing": ["Jest", "Vitest", "Cypress", "Playwright", "Unit Testing", "Integration Testing", "E2E Testing"],
    "architecture": ["Microservices", "Clean Architecture", "DDD", "CQRS", "Event-Driven", "System Design"],

    # Security
    "web_security": ["Cybersecurity", "OWASP", "XSS", "CSRF", "SQL Injection", "SAST", "DAST"],
    "api_security": ["OAuth", "JWT", "API Gateway", "Kong", "REST API", "GraphQL"],

    # API/Integration
    "rest_api": ["REST API", "Postman", "OpenAPI", "JSON", "GraphQL", "gRPC"],
    "graphql": ["GraphQL", "Apollo"],

    # General
    "fullstack": ["JavaScript", "TypeScript", "Node.js", "React", "PostgreSQL", "Docker", "Git"],
    "web_dev": ["JavaScript", "HTML", "CSS", "React", "Node.js", "REST API", "Git"],
}

# Seniority-based years of experience ranges
SENIORITY_YEARS = {
    "INTERN": (0, 0),
    "FRESHER": (0, 1),
    "JUNIOR": (1, 3),
    "MIDDLE": (3, 5),
    "SENIOR": (5, 10),
    "LEADER": (8, 15),
}

SENIORITY_ORDER = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE", "SENIOR", "LEADER"]

# ── Job Templates: title → skill clusters + requirements ─────────────────────
# Each template defines essential skills (from clusters), nice-to-have skills,
# responsibilities, and requirements specific to that job title
JOB_TEMPLATES = {
    # ── React Ecosystem ──────────────────────────────────────────────────────
    "React Developer": {
        "essential_clusters": ["frontend_core", "react", "css_styling"],
        "nice_clusters": ["testing", "rest_api", "graphql", "devops"],
        "responsibilities": [
            "Build and maintain high-performance React applications with modern hooks and patterns",
            "Develop reusable UI components with TypeScript and test with React Testing Library",
            "Implement responsive designs with CSS-in-JS or Tailwind CSS frameworks",
            "Collaborate with UX/UI designers to translate Figma designs into pixel-perfect components",
            "Optimize React performance using code splitting, memoization, and lazy loading",
            "Write comprehensive unit and integration tests using Jest and React Testing Library",
            "Participate in code reviews and mentor junior developers on React best practices",
        ],
        "requirements": [
            "3+ years of experience building production React applications",
            "Expert-level knowledge of React hooks, context, and state management (Redux/Pinia)",
            "Strong proficiency in TypeScript and modern ES6+ JavaScript",
            "Experience with responsive design and CSS frameworks (Tailwind, styled-components)",
            "Familiarity with testing frameworks (Jest, React Testing Library, Cypress)",
            "Understanding of web performance optimization and Core Web Vitals",
        ],
    },
    "React Engineer": {
        "essential_clusters": ["frontend_core", "react", "css_styling", "rest_api"],
        "nice_clusters": ["graphql", "testing", "devops", "architecture"],
        "responsibilities": [
            "Architect scalable React applications with component-driven development",
            "Lead technical decisions on React ecosystem tooling and best practices",
            "Build complex state management solutions for enterprise applications",
            "Implement advanced performance optimizations and bundle analysis",
            "Mentor team members on React patterns and performance optimization",
            "Design and implement reusable component libraries and design systems",
        ],
        "requirements": [
            "5+ years of React development experience with production systems",
            "Deep expertise in React internals, fiber, and concurrent features",
            "Strong background in TypeScript and functional programming patterns",
            "Experience architecting large-scale React applications",
            "Knowledge of micro-frontends and module federation",
        ],
    },
    "React Native Developer": {
        "essential_clusters": ["react_native", "frontend_core"],
        "nice_clusters": ["ios", "android", "testing", "graphql"],
        "responsibilities": [
            "Develop cross-platform mobile applications using React Native",
            "Build native modules and bridges when platform-specific features are needed",
            "Implement complex navigation flows and state management for mobile apps",
            "Optimize mobile performance for smooth 60fps animations and fast load times",
            "Collaborate with designers to implement platform-specific UI patterns",
            "Debug and resolve cross-platform compatibility issues",
        ],
        "requirements": [
            "3+ years of React Native development experience",
            "Strong JavaScript/TypeScript skills with React ecosystem knowledge",
            "Experience with React Native navigation, state management (Redux/MobX)",
            "Familiarity with native iOS (Swift) or Android (Kotlin) development",
            "Understanding of mobile performance optimization techniques",
        ],
    },
    "Next.js Developer": {
        "essential_clusters": ["frontend_core", "react", "rest_api"],
        "nice_clusters": ["css_styling", "graphql", "devops", "aws"],
        "responsibilities": [
            "Build server-side rendered (SSR) and statically generated (SSG) web applications",
            "Implement API routes and serverless functions with Next.js",
            "Optimize pages for SEO and Core Web Vitals metrics",
            "Develop reusable React components with TypeScript and Tailwind CSS",
            "Configure Next.js deployment on Vercel, AWS, or similar platforms",
            "Implement authentication flows with NextAuth.js or similar solutions",
        ],
        "requirements": [
            "3+ years with React and 2+ years specifically with Next.js",
            "Strong understanding of SSR, SSG, and ISR rendering strategies",
            "Experience with Next.js API routes and serverless functions",
            "Proficiency in TypeScript and modern CSS solutions",
            "Knowledge of SEO best practices for React applications",
        ],
    },
    "Frontend Engineer": {
        "essential_clusters": ["frontend_core", "css_styling", "rest_api"],
        "nice_clusters": ["react", "vue", "angular", "testing", "graphql"],
        "responsibilities": [
            "Develop responsive web applications using modern frontend technologies",
            "Implement cross-browser compatible UI components and layouts",
            "Collaborate with backend developers to integrate REST/GraphQL APIs",
            "Ensure accessibility compliance (WCAG 2.1) across all user interfaces",
            "Optimize frontend performance and bundle sizes",
            "Write clean, maintainable code with comprehensive testing",
        ],
        "requirements": [
            "3+ years of frontend development experience",
            "Strong proficiency in JavaScript/TypeScript and HTML/CSS",
            "Experience with at least one modern framework (React, Vue, Angular)",
            "Knowledge of web accessibility standards and SEO best practices",
            "Familiarity with testing frameworks and CI/CD pipelines",
        ],
    },
    "Vue.js Developer": {
        "essential_clusters": ["frontend_core", "vue", "css_styling"],
        "nice_clusters": ["testing", "rest_api", "graphql"],
        "responsibilities": [
            "Build modern Vue.js 3 applications using Composition API",
            "Develop reusable components with Pinia for state management",
            "Implement server-side rendering with Nuxt.js for SEO optimization",
            "Create responsive layouts with Tailwind CSS or SCSS",
            "Write comprehensive tests using Vitest and Vue Test Utils",
            "Collaborate with backend teams for API integration",
        ],
        "requirements": [
            "3+ years of Vue.js development experience",
            "Strong knowledge of Vue 3 Composition API and Options API",
            "Experience with Pinia or Vuex for state management",
            "Familiarity with Nuxt.js for SSR/SSG applications",
            "Proficiency in TypeScript and modern CSS solutions",
        ],
    },
    "Angular Developer": {
        "essential_clusters": ["frontend_core", "angular", "rest_api"],
        "nice_clusters": ["ngrx", "testing", "graphql"],
        "responsibilities": [
            "Build enterprise Angular applications with modern RxJS patterns",
            "Develop reusable components using Angular Material UI library",
            "Implement complex forms with reactive forms and validation",
            "Create NgRx state management for large-scale applications",
            "Write unit tests with Jasmine/Karma and integration tests",
            "Optimize bundle size and application performance",
        ],
        "requirements": [
            "3+ years of Angular development experience (Angular 2+)",
            "Strong proficiency in TypeScript and RxJS observables",
            "Experience with Angular Material and reactive forms",
            "Knowledge of NgRx for state management in large apps",
            "Familiarity with Angular testing frameworks (Jasmine, Jest)",
        ],
    },

    # ── Node.js / Backend Ecosystem ──────────────────────────────────────────
    "Node.js Developer": {
        "essential_clusters": ["nodejs", "sql_db", "rest_api"],
        "nice_clusters": ["graphql", "devops", "architecture", "api_security"],
        "responsibilities": [
            "Develop scalable backend services and RESTful APIs with Node.js",
            "Design and implement database schemas with PostgreSQL and Redis",
            "Build authentication and authorization systems (JWT, OAuth)",
            "Implement microservices architecture with message queues (Kafka, RabbitMQ)",
            "Write comprehensive unit and integration tests",
            "Optimize API performance and database query efficiency",
        ],
        "requirements": [
            "3+ years of Node.js development experience",
            "Strong proficiency in JavaScript/TypeScript and Express/NestJS",
            "Experience with PostgreSQL, MongoDB, and Redis",
            "Knowledge of RESTful API design and GraphQL",
            "Familiarity with Docker, Kubernetes, and CI/CD pipelines",
        ],
    },
    "NestJS Developer": {
        "essential_clusters": ["nodejs", "sql_db", "typescript"],
        "nice_clusters": ["graphql", "devops", "architecture", "api_security"],
        "responsibilities": [
            "Build enterprise-grade backend services using NestJS framework",
            "Implement modular architecture with dependency injection",
            "Design and develop REST and GraphQL APIs with TypeORM/Prisma",
            "Create authentication guards, rate limiting, and security middleware",
            "Write automated tests with Jest (unit, integration, e2e)",
            "Optimize database queries and implement caching strategies",
        ],
        "requirements": [
            "3+ years of Node.js experience with 2+ years of NestJS",
            "Expert-level TypeScript knowledge and OOP/design patterns",
            "Experience with TypeORM, Prisma, or similar ORMs",
            "Knowledge of microservices patterns and message brokers",
            "Understanding of authentication (JWT, Passport, OAuth2)",
        ],
    },
    "Backend Engineer": {
        "essential_clusters": ["nodejs", "python", "sql_db"],
        "nice_clusters": ["devops", "architecture", "graphql"],
        "responsibilities": [
            "Design and implement scalable backend systems and APIs",
            "Develop database models and optimize complex queries",
            "Build authentication, authorization, and security features",
            "Create and maintain CI/CD pipelines for backend services",
            "Implement caching, queue systems, and event-driven architectures",
            "Write technical documentation and API specifications",
        ],
        "requirements": [
            "4+ years of backend development experience",
            "Proficiency in at least one backend language (Node.js, Python, Go)",
            "Strong SQL and database design skills",
            "Experience with cloud platforms (AWS, GCP, Azure)",
            "Knowledge of microservices and distributed systems",
        ],
    },

    # ── Python Ecosystem ─────────────────────────────────────────────────────
    "Python Backend Engineer": {
        "essential_clusters": ["python", "sql_db", "rest_api"],
        "nice_clusters": ["devops", "architecture", "graphql", "data_eng"],
        "responsibilities": [
            "Build RESTful APIs and microservices with FastAPI/Django",
            "Design and implement PostgreSQL database schemas and migrations",
            "Develop asynchronous task processing with Celery and Redis",
            "Implement authentication and authorization systems",
            "Write comprehensive unit and integration tests with pytest",
            "Optimize application performance and database queries",
        ],
        "requirements": [
            "3+ years of Python development experience",
            "Strong proficiency in FastAPI, Django, or Flask",
            "Experience with PostgreSQL, Redis, and async programming",
            "Knowledge of RESTful API design and GraphQL",
            "Familiarity with Docker and CI/CD pipelines",
        ],
    },
    "FastAPI Developer": {
        "essential_clusters": ["python", "sql_db", "rest_api"],
        "nice_clusters": ["graphql", "devops", "llm_ai", "architecture"],
        "responsibilities": [
            "Develop high-performance APIs with FastAPI and Pydantic",
            "Implement async database operations with SQLAlchemy/Prisma",
            "Create background tasks and scheduled jobs with Celery",
            "Build real-time features with WebSockets and SSE",
            "Write automatic API documentation with OpenAPI/Swagger",
            "Optimize for high concurrency and low latency",
        ],
        "requirements": [
            "3+ years of Python experience with 1+ years FastAPI",
            "Expert knowledge of Python async/await and type hints",
            "Experience with SQLAlchemy, Pydantic, and async databases",
            "Strong understanding of RESTful API design principles",
            "Knowledge of Docker, Redis, and performance optimization",
        ],
    },
    "Django Developer": {
        "essential_clusters": ["python", "sql_db", "rest_api"],
        "nice_clusters": ["devops", "frontend_core"],
        "responsibilities": [
            "Build web applications using Django ORM and templating",
            "Develop REST APIs with Django REST Framework",
            "Implement authentication, permissions, and admin interfaces",
            "Create background tasks with Celery and message queues",
            "Optimize database queries and implement caching",
            "Write tests with Django's test framework and pytest",
        ],
        "requirements": [
            "3+ years of Django development experience",
            "Strong Python skills with Django framework knowledge",
            "Experience with Django ORM, migrations, and admin",
            "Knowledge of Django REST Framework for API development",
            "Familiarity with Celery, Redis, and caching strategies",
        ],
    },

    # ── Java Ecosystem ───────────────────────────────────────────────────────
    "Java Backend Developer": {
        "essential_clusters": ["java", "sql_db"],
        "nice_clusters": ["devops", "architecture", "graphql"],
        "responsibilities": [
            "Develop enterprise backend services with Java and Spring Boot",
            "Design and implement RESTful APIs and microservices",
            "Build database models with JPA/Hibernate and optimize queries",
            "Implement security with Spring Security and OAuth2",
            "Write unit tests with JUnit and integration tests",
            "Deploy and monitor applications on cloud platforms",
        ],
        "requirements": [
            "4+ years of Java development experience",
            "Strong proficiency in Spring Boot, Spring MVC, and Spring Security",
            "Experience with JPA/Hibernate and database optimization",
            "Knowledge of microservices architecture and Docker",
            "Familiarity with Kafka, Redis, and cloud platforms",
        ],
    },
    "Spring Boot Developer": {
        "essential_clusters": ["java", "sql_db", "rest_api"],
        "nice_clusters": ["devops", "architecture", "graphql", "api_security"],
        "responsibilities": [
            "Build production-ready microservices with Spring Boot",
            "Implement reactive programming with Spring WebFlux",
            "Design and develop REST/GraphQL APIs with Spring Data",
            "Create comprehensive security configurations with OAuth2/JWT",
            "Write automated tests with JUnit 5 and Mockito",
            "Configure and manage deployments with Docker and Kubernetes",
        ],
        "requirements": [
            "4+ years of Java with 2+ years of Spring Boot",
            "Expert knowledge of Spring ecosystem (Boot, Security, Data)",
            "Experience with JPA, MongoDB, and Redis integration",
            "Knowledge of microservices patterns and cloud-native development",
            "Familiarity with Kafka, reactive streams, and observability",
        ],
    },

    # ── Go Ecosystem ─────────────────────────────────────────────────────────
    "Go Developer": {
        "essential_clusters": ["go", "sql_db", "rest_api"],
        "nice_clusters": ["devops", "architecture", "graphql"],
        "responsibilities": [
            "Build high-performance backend services with Go",
            "Design and implement gRPC APIs and microservices",
            "Develop concurrent systems using Go's goroutines and channels",
            "Create Docker containers and Kubernetes deployments",
            "Write comprehensive tests and benchmarks",
            "Optimize for performance and memory efficiency",
        ],
        "requirements": [
            "3+ years of Go development experience",
            "Strong proficiency in Go syntax, concurrency, and idioms",
            "Experience with gRPC, REST APIs, and microservices",
            "Knowledge of Docker, Kubernetes, and cloud-native patterns",
            "Understanding of performance profiling and optimization",
        ],
    },
    "Golang Backend Engineer": {
        "essential_clusters": ["go", "sql_db", "rest_api"],
        "nice_clusters": ["devops", "architecture", "aws", "monitoring"],
        "responsibilities": [
            "Architect and develop scalable Go microservices",
            "Implement high-throughput APIs with gRPC and Protocol Buffers",
            "Build event-driven systems with Kafka and message queues",
            "Create comprehensive observability with Prometheus and Grafana",
            "Write idiomatic Go code with thorough testing",
            "Deploy and manage services on Kubernetes clusters",
        ],
        "requirements": [
            "4+ years of Go experience with microservices architecture",
            "Deep understanding of Go internals and best practices",
            "Experience with gRPC, REST, and GraphQL APIs",
            "Knowledge of Kubernetes, Helm, and service meshes",
            "Strong background in distributed systems design",
        ],
    },

    # ── Full Stack ───────────────────────────────────────────────────────────
    "Full Stack Developer": {
        "essential_clusters": ["fullstack", "frontend_core", "css_styling", "sql_db"],
        "nice_clusters": ["devops", "graphql", "aws", "testing"],
        "responsibilities": [
            "Develop end-to-end features from frontend UI to backend APIs",
            "Build React/Vue components and Node.js/Python backend services",
            "Design and implement PostgreSQL database schemas",
            "Create RESTful APIs and GraphQL resolvers",
            "Deploy and maintain applications on cloud platforms",
            "Write automated tests for both frontend and backend",
        ],
        "requirements": [
            "4+ years of full-stack development experience",
            "Proficiency in React/Vue and Node.js/Python backend",
            "Strong SQL database skills and API design knowledge",
            "Experience with Docker, CI/CD, and cloud deployment",
            "Ability to work independently on complete features",
        ],
    },
    "Software Engineer": {
        "essential_clusters": ["fullstack", "web_dev"],
        "nice_clusters": ["devops", "testing", "architecture"],
        "responsibilities": [
            "Design and implement software solutions across the stack",
            "Write clean, efficient, and well-documented code",
            "Participate in code reviews and technical design discussions",
            "Debug and resolve production issues promptly",
            "Collaborate with cross-functional teams on product features",
            "Continuously improve engineering standards and practices",
        ],
        "requirements": [
            "3+ years of software engineering experience",
            "Strong programming skills in at least two languages",
            "Understanding of software design patterns and SOLID principles",
            "Experience with version control and collaborative development",
            "Problem-solving abilities and attention to detail",
        ],
    },

    # ── AI/ML ─────────────────────────────────────────────────────────────────
    "ML Engineer": {
        "essential_clusters": ["ml_data", "sql_db"],
        "nice_clusters": ["llm_ai", "data_eng", "devops", "aws"],
        "responsibilities": [
            "Design and deploy machine learning models to production",
            "Build data pipelines for training and inference",
            "Optimize model performance and handle model versioning",
            "Implement feature engineering and data preprocessing pipelines",
            "Collaborate with data scientists to scale algorithms",
            "Monitor model performance and implement retraining strategies",
        ],
        "requirements": [
            "3+ years of ML engineering experience",
            "Strong Python skills with TensorFlow/PyTorch expertise",
            "Experience with MLflow, Kubeflow, or similar MLOps tools",
            "Knowledge of distributed training and model optimization",
            "Familiarity with cloud ML platforms (AWS SageMaker, GCP Vertex)",
        ],
    },
    "AI Engineer": {
        "essential_clusters": ["llm_ai", "ml_data", "python"],
        "nice_clusters": ["data_eng", "devops"],
        "responsibilities": [
            "Build and deploy LLM-powered applications with LangChain",
            "Implement RAG systems and vector databases (Pinecone, Weaviate)",
            "Fine-tune foundation models for specific use cases",
            "Design prompt engineering strategies and evaluate outputs",
            "Create APIs for AI services and integrate with products",
            "Monitor AI system performance and implement safety measures",
        ],
        "requirements": [
            "3+ years of AI/ML engineering experience",
            "Strong Python skills with LLM framework expertise",
            "Experience with LangChain, Hugging Face, and vector DBs",
            "Knowledge of prompt engineering and model evaluation",
            "Familiarity with RAG architectures and fine-tuning techniques",
        ],
    },
    "Data Scientist": {
        "essential_clusters": ["ml_data", "sql_db", "python"],
        "nice_clusters": ["data_eng", "llm_ai"],
        "responsibilities": [
            "Analyze complex datasets to extract actionable insights",
            "Build and validate predictive models for business problems",
            "Create data visualizations and dashboards for stakeholders",
            "Develop statistical models and A/B testing frameworks",
            "Collaborate with engineering to deploy models to production",
            "Communicate findings through reports and presentations",
        ],
        "requirements": [
            "3+ years of data science experience",
            "Strong Python/R skills with statistical modeling expertise",
            "Experience with scikit-learn, TensorFlow, or PyTorch",
            "Knowledge of SQL and data visualization tools",
            "Statistical background and experimental design skills",
        ],
    },

    # ── DevOps / Cloud ───────────────────────────────────────────────────────
    "DevOps Engineer": {
        "essential_clusters": ["devops", "git_cicd", "monitoring", "aws"],
        "nice_clusters": ["gcp", "azure", "architecture"],
        "responsibilities": [
            "Build and maintain CI/CD pipelines for multiple teams",
            "Manage Kubernetes clusters and container orchestration",
            "Implement infrastructure as code with Terraform/Ansible",
            "Monitor system health with Prometheus, Grafana, and alerting",
            "Troubleshoot production issues and implement auto-remediation",
            "Optimize cloud costs and resource utilization",
        ],
        "requirements": [
            "4+ years of DevOps/SRE experience",
            "Strong expertise in Docker, Kubernetes, and Helm",
            "Experience with Terraform, Ansible, or similar IaC tools",
            "Knowledge of AWS/GCP/Azure cloud platforms",
            "Proficiency in monitoring, logging, and observability tools",
        ],
    },
    "SRE Engineer": {
        "essential_clusters": ["devops", "monitoring", "aws"],
        "nice_clusters": ["architecture", "git_cicd", "web_security"],
        "responsibilities": [
            "Ensure reliability and performance of production systems",
            "Implement SLOs, SLIs, and error budgets across services",
            "Build automated incident response and runbook systems",
            "Conduct post-mortems and implement preventive measures",
            "Optimize system performance and capacity planning",
            "Champion reliability best practices across engineering teams",
        ],
        "requirements": [
            "4+ years of SRE or infrastructure experience",
            "Strong scripting skills (Python, Bash, Go)",
            "Experience with Kubernetes, monitoring, and observability",
            "Knowledge of incident management and reliability engineering",
            "Familiarity with service mesh and traffic management",
        ],
    },
    "AWS Engineer": {
        "essential_clusters": ["aws", "devops", "git_cicd"],
        "nice_clusters": ["architecture", "monitoring", "data_eng"],
        "responsibilities": [
            "Design and implement AWS infrastructure solutions",
            "Build serverless applications with Lambda and Step Functions",
            "Manage EC2, ECS, EKS, and container orchestration on AWS",
            "Implement security best practices with IAM and security groups",
            "Optimize costs with reserved instances and savings plans",
            "Build disaster recovery and backup solutions",
        ],
        "requirements": [
            "4+ years of AWS experience with multiple services",
            "AWS Solutions Architect or Developer certification preferred",
            "Experience with Lambda, ECS/EKS, RDS, and serverless patterns",
            "Knowledge of AWS security, networking, and cost optimization",
            "Infrastructure as Code experience with CDK or Terraform",
        ],
    },

    # ── Mobile ────────────────────────────────────────────────────────────────
    "Flutter Developer": {
        "essential_clusters": ["flutter", "frontend_core"],
        "nice_clusters": ["ios", "android", "testing"],
        "responsibilities": [
            "Develop cross-platform mobile apps with Flutter and Dart",
            "Build custom widgets and animations with Flutter SDK",
            "Implement state management with BLoC, Provider, or Riverpod",
            "Integrate with REST APIs and Firebase backend services",
            "Optimize app performance for iOS and Android platforms",
            "Write unit and widget tests for Flutter applications",
        ],
        "requirements": [
            "3+ years of Flutter development experience",
            "Strong Dart programming skills with Flutter framework",
            "Experience with state management solutions (BLoC, Riverpod)",
            "Knowledge of platform-specific integrations and plugins",
            "Understanding of mobile UI/UX best practices",
        ],
    },
    "iOS Developer": {
        "essential_clusters": ["ios", "swift"],
        "nice_clusters": ["android", "firebase", "testing"],
        "responsibilities": [
            "Develop native iOS applications using Swift and UIKit/SwiftUI",
            "Build complex UI layouts with Auto Layout and SwiftUI",
            "Implement data persistence with Core Data and UserDefaults",
            "Integrate with REST APIs and third-party SDKs",
            "Optimize app performance and battery consumption",
            "Write unit tests with XCTest and UI tests",
        ],
        "requirements": [
            "3+ years of iOS development experience",
            "Expert Swift programming skills with UIKit/SwiftUI",
            "Experience with Xcode, CocoaPods, and SPM",
            "Knowledge of iOS performance optimization and memory management",
            "Understanding of App Store submission and review process",
        ],
    },
    "Android Developer": {
        "essential_clusters": ["android", "kotlin"],
        "nice_clusters": ["ios", "firebase", "testing"],
        "responsibilities": [
            "Develop native Android applications with Kotlin and Jetpack",
            "Build responsive UIs with Compose or XML layouts",
            "Implement MVVM architecture with Hilt/Dagger dependency injection",
            "Integrate with REST APIs and Firebase services",
            "Optimize app performance and implement security best practices",
            "Write unit and instrumentation tests with Espresso",
        ],
        "requirements": [
            "3+ years of Android development experience",
            "Strong Kotlin skills with Android SDK expertise",
            "Experience with Jetpack Compose, Room, and Hilt",
            "Knowledge of Android architecture components and patterns",
            "Understanding of Google Play publishing and analytics",
        ],
    },

    # ── Data Engineering ──────────────────────────────────────────────────────
    "Data Engineer": {
        "essential_clusters": ["data_eng", "sql_db", "python"],
        "nice_clusters": ["ml_data", "devops", "aws"],
        "responsibilities": [
            "Design and build scalable data pipelines with Airflow/Spark",
            "Develop ETL processes for data ingestion and transformation",
            "Implement data quality checks and monitoring",
            "Optimize query performance and data warehouse schemas",
            "Collaborate with data scientists on data infrastructure needs",
            "Manage data governance and lineage tracking",
        ],
        "requirements": [
            "4+ years of data engineering experience",
            "Strong Python and SQL skills with Spark experience",
            "Experience with Airflow, dbt, or similar orchestration tools",
            "Knowledge of data warehousing (Snowflake, BigQuery, Redshift)",
            "Familiarity with streaming technologies (Kafka, Flink)",
        ],
    },

    # ── Database ──────────────────────────────────────────────────────────────
    "Database Administrator": {
        "essential_clusters": ["sql_db", "nosql_db"],
        "nice_clusters": ["devops", "monitoring", "aws"],
        "responsibilities": [
            "Administer and maintain PostgreSQL, MySQL, and MongoDB clusters",
            "Implement backup, recovery, and disaster recovery procedures",
            "Optimize database performance with query analysis and indexing",
            "Manage database security, access controls, and encryption",
            "Automate routine tasks with scripting and scheduling",
            "Troubleshoot production database issues and implement solutions",
        ],
        "requirements": [
            "4+ years of DBA experience with multiple database systems",
            "Strong SQL skills and database internals knowledge",
            "Experience with replication, sharding, and high availability",
            "Knowledge of database security and compliance requirements",
            "Scripting skills for automation (Bash, Python)",
        ],
    },

    # ── Security ──────────────────────────────────────────────────────────────
    "Cybersecurity Engineer": {
        "essential_clusters": ["web_security", "api_security"],
        "nice_clusters": ["devops", "architecture", "monitoring"],
        "responsibilities": [
            "Conduct security assessments and penetration testing",
            "Implement security controls and vulnerability remediation",
            "Monitor security events with SIEM tools and alerting",
            "Develop security policies and compliance frameworks",
            "Investigate security incidents and perform forensics",
            "Train developers on secure coding practices",
        ],
        "requirements": [
            "4+ years of cybersecurity experience",
            "Knowledge of OWASP Top 10 and secure coding practices",
            "Experience with SIEM, penetration testing, and threat modeling",
            "Security certifications (CISSP, CEH, OSCP) preferred",
            "Strong understanding of network security and encryption",
        ],
    },

    # ── QA / Testing ──────────────────────────────────────────────────────────
    "QA Engineer": {
        "essential_clusters": ["testing", "rest_api"],
        "nice_clusters": ["devops", "frontend_core"],
        "responsibilities": [
            "Design and execute manual and automated test cases",
            "Build and maintain automated test frameworks (Selenium, Cypress)",
            "Report and track bugs through the development lifecycle",
            "Implement API testing with Postman or similar tools",
            "Collaborate with developers on test strategy and coverage",
            "Analyze test results and provide quality metrics",
        ],
        "requirements": [
            "3+ years of QA experience with test automation",
            "Experience with Selenium, Cypress, or Playwright",
            "Strong API testing skills with Postman or REST Assured",
            "Knowledge of CI/CD integration for automated testing",
            "ISTQB or similar testing certification preferred",
        ],
    },

    # ── Product / Management ──────────────────────────────────────────────────
    "Technical Product Manager": {
        "essential_clusters": ["architecture", "rest_api", "fullstack"],
        "nice_clusters": ["devops", "llm_ai", "data_eng"],
        "responsibilities": [
            "Define product roadmap and technical requirements",
            "Prioritize features based on user impact and technical feasibility",
            "Work closely with engineering teams on implementation",
            "Analyze user behavior and product metrics",
            "Communicate product vision to stakeholders and leadership",
            "Balance technical debt with new feature development",
        ],
        "requirements": [
            "5+ years of product management experience in tech",
            "Strong technical background with software development experience",
            "Experience with agile methodologies and sprint planning",
            "Data-driven decision making with analytics skills",
            "Excellent communication and stakeholder management abilities",
        ],
    },
    "Scrum Master": {
        "essential_clusters": ["fullstack", "rest_api"],
        "nice_clusters": ["devops", "testing"],
        "responsibilities": [
            "Facilitate Scrum ceremonies (sprint planning, daily standups, retrospectives)",
            "Remove impediments and support the development team",
            "Coach team on agile principles and continuous improvement",
            "Track sprint progress and manage velocity metrics",
            "Protect team from external interruptions and scope changes",
            "Foster a collaborative and high-performing team culture",
        ],
        "requirements": [
            "3+ years as a Scrum Master or agile coach",
            "PSM I/II or CSM certification preferred",
            "Experience with Jira, Azure DevOps, or similar tools",
            "Strong facilitation and conflict resolution skills",
            "Understanding of technical development processes",
        ],
    },
}

# Fallback template for any job titles not explicitly defined
FALLBACK_TEMPLATE = {
    "essential_clusters": ["fullstack", "web_dev"],
    "nice_clusters": ["testing", "devops", "rest_api"],
    "responsibilities": [
        "Develop and maintain software applications using modern technologies",
        "Write clean, efficient, and well-documented code",
        "Collaborate with cross-functional teams on product development",
        "Participate in code reviews and technical design discussions",
        "Troubleshoot and debug production issues",
    ],
    "requirements": [
        "3+ years of software development experience",
        "Proficiency in at least one programming language",
        "Knowledge of software design patterns and best practices",
        "Experience with version control and collaborative development",
        "Strong problem-solving and communication skills",
    ],
}

# ── Industry / role pools ─────────────────────────────────────────────────────
INDUSTRIES: dict = {
    "Technology & IT": {
        "job_titles": list(JOB_TEMPLATES.keys()),
        "roles": [
            "React Developer", "Vue.js Developer", "Angular Developer", "Next.js Developer",
            "Node.js Developer", "Python Backend Developer", "Go Developer", "Java Developer",
            "Full Stack Developer", "Frontend Engineer", "Mobile Developer",
            "AI/ML Engineer", "Data Engineer", "DevOps Engineer", "SRE",
        ],
        "responsibilities": [
            "Design and develop scalable software applications",
            "Write clean, maintainable, and well-tested code",
            "Collaborate with cross-functional teams on product features",
            "Participate in code reviews and technical discussions",
            "Mentor junior developers and share knowledge",
        ],
        "requirements": [
            "Bachelor's degree in Computer Science or equivalent experience",
            "Strong problem-solving and communication skills",
            "Experience with agile development methodologies",
            "Ability to work in a collaborative team environment",
        ],
    },
    "Finance & Banking": {
        "job_titles": [
            "Backend Engineer", "Data Engineer", "DevOps Engineer",
            "Full Stack Developer", "QA Engineer",
        ],
        "roles": [
            "Backend Developer", "DevOps Engineer", "Security Engineer",
            "Data Engineer", "Full Stack Developer",
        ],
        "responsibilities": [
            "Develop secure financial applications and APIs",
            "Implement compliance and regulatory requirements",
            "Build data pipelines for financial reporting",
            "Maintain high-security standards for financial data",
        ],
        "requirements": [
            "Bachelor's in Computer Science or related field",
            "Strong quantitative and analytical skills",
            "Knowledge of financial regulations and compliance",
            "Experience with secure software development",
        ],
    },
    "Healthcare & Medical": {
        "job_titles": [
            "Full Stack Developer", "Backend Engineer", "Frontend Engineer",
            "DevOps Engineer", "Data Engineer",
        ],
        "roles": [
            "Healthcare Software Developer", "Medical Data Analyst",
            "Healthcare IT Specialist", "Backend Developer",
        ],
        "responsibilities": [
            "Build healthcare software applications with HIPAA compliance",
            "Develop APIs for medical data exchange",
            "Implement secure patient data management systems",
            "Build integrations with EHR/EMR systems",
        ],
        "requirements": [
            "Degree in Computer Science or related field",
            "Experience with healthcare data standards",
            "Knowledge of HIPAA and healthcare regulations",
            "Strong security and compliance mindset",
        ],
    },
    "Education": {
        "job_titles": [
            "Frontend Engineer", "Full Stack Developer", "Backend Engineer",
            "Mobile Developer", "Data Scientist",
        ],
        "roles": [
            "EdTech Developer", "E-learning Engineer", "Education Platform Developer",
            "Frontend Developer", "Full Stack Developer",
        ],
        "responsibilities": [
            "Build e-learning platforms and educational applications",
            "Develop interactive features for online learning",
            "Integrate with LMS platforms (Moodle, Canvas)",
            "Create responsive and accessible user interfaces",
        ],
        "requirements": [
            "Degree in Computer Science or Education Technology",
            "Experience with LMS platforms and e-learning tools",
            "Strong frontend development skills",
            "Passion for education and learning technology",
        ],
    },
    "Marketing & Advertising": {
        "job_titles": [
            "Frontend Engineer", "Full Stack Developer", "Backend Engineer",
            "Data Scientist", "DevOps Engineer",
        ],
        "roles": [
            "Marketing Tech Developer", "Digital Marketing Engineer",
            "Marketing Automation Developer", "Full Stack Developer",
        ],
        "responsibilities": [
            "Build marketing technology platforms and automation tools",
            "Develop integrations with marketing tools (HubSpot, Marketo)",
            "Create analytics dashboards for campaign tracking",
            "Implement A/B testing and personalization features",
        ],
        "requirements": [
            "Degree in Computer Science or Marketing",
            "Experience with marketing automation platforms",
            "Strong analytical and data visualization skills",
            "Knowledge of SEO and digital marketing concepts",
        ],
    },
}

COMPANIES_DATA = [
    {"name": "TechNova Solutions",  "industry": "Technology & IT",        "city": "Ho Chi Minh City"},
    {"name": "VietFinance Capital", "industry": "Finance & Banking",       "city": "Hanoi"},
    {"name": "MedCare Vietnam",     "industry": "Healthcare & Medical",    "city": "Da Nang"},
    {"name": "EduBright Academy",   "industry": "Education",               "city": "Ho Chi Minh City"},
    {"name": "AdSpark Agency",      "industry": "Marketing & Advertising", "city": "Hanoi"},
]

SEEKERS_PER_INDUSTRY = 21   # 5 × 21 = 105 job seekers


# ── Helpers ───────────────────────────────────────────────────────────────────

def new_id() -> str:
    return str(uuid.uuid4())


def pick(pool: list, n: int) -> list:
    return random.sample(pool, min(n, len(pool)))


def get_clusters_skills(clusters: list) -> set:
    """Get all skills from a list of cluster names."""
    skills = set()
    for cluster_name in clusters:
        if cluster_name in SKILL_CLUSTERS:
            skills.update(SKILL_CLUSTERS[cluster_name])
    return skills


def get_job_template(title: str) -> dict:
    """Get job template by title, or return fallback if not found."""
    return JOB_TEMPLATES.get(title, FALLBACK_TEMPLATE)


def generate_job_content(title: str) -> dict:
    """Generate skills, responsibilities, and requirements for a job based on its template."""
    template = get_job_template(title)

    # Get essential skills from clusters
    essential_skills = get_clusters_skills(template["essential_clusters"])
    nice_skills = get_clusters_skills(template["nice_clusters"])

    # Remove overlap: nice skills should not include essential skills
    nice_skills = nice_skills - essential_skills

    # LIMIT SKILLS: Pick only 2-5 essential skills and 1-2 nice skills
    # This ensures each job focuses on specific skills rather than having too many
    essential_list = pick(list(essential_skills), random.randint(2, 5))
    nice_list = pick(list(nice_skills), random.randint(1, 2))

    # Select random subset of responsibilities (3-5)
    responsibilities = pick(template["responsibilities"], min(4, len(template["responsibilities"])))

    # Select random subset of requirements (2-3)
    requirements = pick(template["requirements"], min(3, len(template["requirements"])))

    return {
        "must_skills": essential_list,
        "nice_skills": nice_list,
        "responsibilities": responsibilities,
        "requirements": requirements,
    }


def make_job_text(title: str, industry: str, skills: list, levels: list, responsibilities: list) -> str:
    return (
        f"Title: {title} | Industry: {industry} | "
        f"Skills: {', '.join(skills)} | "
        f"Seniority: {', '.join(levels)} | "
        f"Responsibilities: {'. '.join(responsibilities[:3])}"
    )


def make_resume_text(role: str, industry: str, seniority: str, skills: list,
                     summary: str, bullets: list) -> str:
    return (
        f"Role: {role} | Industry: {industry} | Seniority: {seniority} | "
        f"Skills: {', '.join(skills)} | Summary: {summary} | "
        f"Experience: {'. '.join(bullets[:2])}"
    )


# ── Phase 1: PostgreSQL inserts ───────────────────────────────────────────────

def phase_db(conn) -> tuple:
    """Insert all synthetic data.  Returns (job_records, seeker_records, stats)."""
    cur = conn.cursor()
    stats = {k: 0 for k in ("companies", "jobs", "job_seekers", "resumes", "interactions", "applications")}

    # ── 1. Load industries (seeded by V36 migration) ──────────────────────────
    cur.execute("SELECT name, id FROM industries")
    industry_map: dict = {row[0]: row[1] for row in cur.fetchall()}
    logger.info("Loaded %d industries from DB", len(industry_map))

    # ── 2. Upsert all skills (collect from skill clusters) ─────────────────────
    all_skills: set = set()
    for cluster_skills in SKILL_CLUSTERS.values():
        all_skills.update(cluster_skills)

    skill_map: dict = {}
    for name in sorted(all_skills):
        sid = new_id()
        cur.execute(
            "INSERT INTO skills (id, name) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING",
            (sid, name),
        )
        cur.execute("SELECT id FROM skills WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            skill_map[name] = row[0]
    conn.commit()
    logger.info("Skill map ready: %d skills", len(skill_map))

    # ── 3. Companies + addresses + staff ──────────────────────────────────────
    company_ids: dict = {}
    address_ids: dict = {}

    for c in COMPANIES_DATA:
        cname      = c["name"]
        slug       = cname.lower().replace(" ", "").replace("&", "")
        user_id    = new_id()
        company_id = new_id()
        address_id = new_id()
        staff_id   = new_id()

        cur.execute(
            """INSERT INTO users (id, email, password_hash, full_name, role, status, created_at)
               VALUES (%s, %s, %s, %s, 'COMPANY', 'ACTIVE', NOW())
               ON CONFLICT DO NOTHING""",
            (user_id, f"owner.{slug}@seed.local", _BCRYPT_PLACEHOLDER, f"Owner {cname}"),
        )
        cur.execute(
            """INSERT INTO companies (id, name, description, website, is_verified, created_at)
               VALUES (%s, %s, %s, %s, true, NOW())""",
            (company_id, cname, f"Leading company in {c['industry']}",
             f"https://{slug}.example.com"),
        )
        cur.execute(
            """INSERT INTO company_addresses
               (id, company_id, label, address_line, city, country, is_default, created_at)
               VALUES (%s, %s, 'Headquarters', %s, %s, 'Vietnam', true, NOW())""",
            (address_id, company_id, f"123 Main Street", c["city"]),
        )
        cur.execute(
            "INSERT INTO staff (id, user_id, company_id, role, created_at) VALUES (%s, %s, %s, 'OWNER', NOW())",
            (staff_id, user_id, company_id),
        )
        company_ids[cname] = company_id
        address_ids[cname] = address_id
        stats["companies"] += 1

    conn.commit()
    logger.info("Inserted %d companies", stats["companies"])

    # ── 4. Jobs (template-based with consistent skills/requirements) ───────────
    job_records: list = []

    for c in COMPANIES_DATA:
        industry_name = c["industry"]
        industry_id   = industry_map.get(industry_name)
        if not industry_id:
            logger.warning("Industry '%s' not found in DB — skipping", industry_name)
            continue

        pool       = INDUSTRIES[industry_name]
        company_id = company_ids[c["name"]]
        address_id = address_ids[c["name"]]

        for title in pool["job_titles"]:
            job_id = new_id()

            # Get template-based content (consistent with job title)
            content = generate_job_content(title)
            must_skills = content["must_skills"]
            nice_skills = content["nice_skills"]
            responsibilities = content["responsibilities"]
            requirements = content["requirements"]

            # Determine seniority levels based on template
            template = get_job_template(title)
            # Map template to appropriate seniority levels (smaller pool for variety)
            if "SENIOR" in str(template.get("requirements", [""])):
                levels = random.sample(["MIDDLE", "SENIOR", "LEADER"], k=random.randint(2, 3))
            else:
                levels = random.sample(["JUNIOR", "MIDDLE", "SENIOR"], k=random.randint(2, 3))

            salary_min = random.choice([800, 1000, 1200, 1500, 2000])
            salary_max = salary_min + random.choice([500, 700, 1000, 1500])
            job_type   = random.choice(["FULLTIME", "REMOTE", "HYBRID"])

            cur.execute(
                """INSERT INTO jobs
                   (id, company_id, company_address_id, industry_id,
                    title, description, location, salary_min, salary_max,
                    job_type, status, responsibilities, requirements, nice_to_have_skills,
                    created_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::job_type,'PUBLISHED',%s,%s,%s,NOW())""",
                (
                    job_id, company_id, address_id, industry_id,
                    title,
                    f"{title} at {c['name']} in the {industry_name} sector.",
                    c["city"], salary_min, salary_max, job_type,
                    responsibilities, requirements, nice_skills,
                ),
            )

            for level in levels:
                cur.execute(
                    "INSERT INTO job_experience_levels (job_id, level) VALUES (%s, %s::experience_level) ON CONFLICT DO NOTHING",
                    (job_id, level),
                )

            # job_skills — composite PK (job_id, skill_id), no id column (V32)
            for skill_name in must_skills:
                skill_id = skill_map.get(skill_name)
                if skill_id:
                    cur.execute(
                        "INSERT INTO job_skills (job_id, skill_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (job_id, skill_id),
                    )

            job_records.append({
                "job_id":           job_id,
                "title":            title,
                "industry":         industry_name,
                "must_skills":      must_skills,
                "nice_skills":      nice_skills,
                "levels":           levels,
                "responsibilities": responsibilities,
            })
            stats["jobs"] += 1

        conn.commit()

    logger.info("Inserted %d jobs", stats["jobs"])

    # ── 5. Job seekers + resumes ──────────────────────────────────────────────
    seeker_records: list = []

    for idx, (industry_name, pool) in enumerate(INDUSTRIES.items()):
        for j in range(SEEKERS_PER_INDUSTRY):
            user_id   = new_id()
            seeker_id = new_id()
            resume_id = new_id()

            role      = random.choice(pool["roles"])
            seniority = random.choice(SENIORITY_ORDER[1:5])   # FRESHER–SENIOR

            # Get skills from clusters for consistent role-based skills
            # Pick 2-3 clusters that match the role
            if "React" in role or "Frontend" in role or "Full Stack" in role:
                clusters = random.sample(["frontend_core", "react", "vue", "angular", "css_styling"], k=3)
            elif "Node" in role or "Backend" in role or "Python" in role or "Go" in role:
                clusters = random.sample(["nodejs", "python", "go", "java", "sql_db", "rest_api"], k=3)
            elif "DevOps" in role or "SRE" in role or "Cloud" in role:
                clusters = random.sample(["devops", "aws", "gcp", "azure", "git_cicd", "monitoring"], k=3)
            elif "Mobile" in role or "Flutter" in role or "iOS" in role or "Android" in role:
                clusters = random.sample(["flutter", "ios", "android", "react_native"], k=2)
            elif "Data" in role or "ML" in role or "AI" in role:
                clusters = random.sample(["ml_data", "data_eng", "llm_ai", "sql_db", "python"], k=3)
            else:
                clusters = random.sample(list(SKILL_CLUSTERS.keys())[:10], k=3)

            skills = list(get_clusters_skills(clusters))
            if len(skills) > 8:
                skills = pick(skills, 8)
            if len(skills) < 4:
                skills = pick(list(SKILL_CLUSTERS.values())[0], 5) + skills

            years_exp = SENIORITY_ORDER.index(seniority) * random.randint(1, 2)
            full_name = f"Seeker {industry_name[:3]}{idx:02d}{j:02d}"
            email     = f"seeker.{industry_name[:3].lower()}{idx:02d}{j:02d}@seed.local"

            summary = (
                f"Experienced {role} with {years_exp} years in {industry_name}. "
                f"Skilled in {', '.join(skills[:3])}."
            )
            bullets = [
                f"Led {role.lower()} initiatives delivering measurable results",
                f"Worked with {skills[0]} and {skills[1] if len(skills) > 1 else skills[0]} in production",
                f"Collaborated with cross-functional teams in {industry_name}",
            ]
            resume_ds = {
                "role": role, "seniority": seniority, "yearsExperience": years_exp,
                "industry": industry_name, "skills": skills,
                "summary": summary, "experienceBullets": bullets,
            }
            parsed_text = make_resume_text(role, industry_name, seniority, skills, summary, bullets)

            cur.execute(
                """INSERT INTO users (id, email, password_hash, full_name, role, status, created_at)
                   VALUES (%s, %s, %s, %s, 'JOBSEEKER', 'ACTIVE', NOW())
                   ON CONFLICT DO NOTHING""",
                (user_id, email, _BCRYPT_PLACEHOLDER, full_name),
            )
            cur.execute(
                """INSERT INTO job_seekers (id, user_id, bio, location, experience_years, created_at)
                   VALUES (%s, %s, %s, 'Vietnam', %s, NOW())""",
                (seeker_id, user_id, summary[:200], years_exp),
            )
            for skill_name in skills:
                skill_id = skill_map.get(skill_name)
                if skill_id:
                    cur.execute(
                        "INSERT INTO job_seeker_skills (job_seeker_id, skill_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (seeker_id, skill_id),
                    )
            cur.execute(
                """INSERT INTO resumes
                   (id, job_seeker_id, file_url, label, file_size, is_primary,
                    parsed_text, resume_data_structure, created_at)
                   VALUES (%s,%s,%s,%s,%s,true,%s,%s::jsonb,NOW())""",
                (
                    resume_id, seeker_id,
                    f"https://storage.example.com/resumes/{resume_id}.pdf",
                    f"{role} Resume",
                    random.randint(50_000, 500_000),
                    parsed_text,
                    json.dumps(resume_ds),
                ),
            )

            seeker_records.append({
                "resume_id": resume_id,
                "seeker_id": seeker_id,
                "industry":  industry_name,
                "skills":    skills,
                "role":      role,
                "seniority": seniority,
                "summary":   summary,
                "bullets":   bullets,
            })
            stats["job_seekers"] += 1
            stats["resumes"]     += 1

        conn.commit()

    logger.info("Inserted %d job seekers + %d resumes", stats["job_seekers"], stats["resumes"])

    # ── 6. Interactions and applications ─────────────────────────────────────
    jobs_by_industry: dict = {}
    for jr in job_records:
        jobs_by_industry.setdefault(jr["industry"], []).append(jr)

    for sr in seeker_records:
        seeker_skills  = set(sr["skills"])
        candidate_jobs = jobs_by_industry.get(sr["industry"], [])
        if not candidate_jobs:
            continue

        ranked = sorted(
            candidate_jobs,
            key=lambda j: len(set(j["must_skills"]) & seeker_skills),
            reverse=True,
        )

        applied_jobs: set = set()

        for rank, jr in enumerate(ranked):
            overlap = len(set(jr["must_skills"]) & seeker_skills)
            if overlap < 1:
                continue
            if rank < 3:
                event_type = "apply"
            elif rank < 6:
                event_type = "save"
            elif rank < 11:
                event_type = "click"
            else:
                break

            cur.execute(
                """INSERT INTO job_interactions (job_seeker_id, job_id, event_type, created_at)
                   VALUES (%s, %s, %s::interaction_event_type, NOW())""",
                (sr["seeker_id"], jr["job_id"], event_type),
            )
            stats["interactions"] += 1

            if event_type == "apply" and jr["job_id"] not in applied_jobs:
                cur.execute("SAVEPOINT sp_app")
                try:
                    cur.execute(
                        """INSERT INTO applications (id, job_id, job_seeker_id, resume_id, status, created_at)
                           VALUES (%s, %s, %s, %s, 'APPLIED', NOW())
                           ON CONFLICT DO NOTHING""",
                        (new_id(), jr["job_id"], sr["seeker_id"], sr["resume_id"]),
                    )
                    applied_jobs.add(jr["job_id"])
                    stats["applications"] += 1
                    cur.execute("RELEASE SAVEPOINT sp_app")
                except Exception as exc:
                    cur.execute("ROLLBACK TO SAVEPOINT sp_app")
                    logger.debug("Application skipped (%s→%s): %s", sr["resume_id"], jr["job_id"], exc)

        conn.commit()

    logger.info(
        "Inserted %d interactions, %d applications",
        stats["interactions"], stats["applications"],
    )
    cur.close()
    return job_records, seeker_records, stats


# ── Phase 2: AI service sync ──────────────────────────────────────────────────

def phase_sync(job_records: list, seeker_records: list, ai_url: str, delay: float) -> dict:
    """POST every node and interaction to the AI service."""
    base    = ai_url.rstrip("/")
    session = requests.Session()
    stats   = {"nodes": 0, "interactions": 0, "errors": 0}

    # ── 2a. Job nodes ─────────────────────────────────────────────────────────
    logger.info("Syncing %d job nodes...", len(job_records))
    for jr in job_records:
        text = make_job_text(jr["title"], jr["industry"], jr["must_skills"],
                             jr["levels"], jr["responsibilities"])
        try:
            r = session.post(f"{base}/api/v1/add_node",
                             json={"node_id": jr["job_id"], "text": text, "node_type": "job"},
                             timeout=30)
            r.raise_for_status()
            stats["nodes"] += 1
        except Exception as exc:
            logger.warning("add_node job %s: %s", jr["job_id"], exc)
            stats["errors"] += 1
        time.sleep(delay)

    # ── 2b. Resume nodes ──────────────────────────────────────────────────────
    logger.info("Syncing %d resume nodes...", len(seeker_records))
    for sr in seeker_records:
        text = make_resume_text(sr["role"], sr["industry"], sr["seniority"],
                                sr["skills"], sr["summary"], sr["bullets"])
        try:
            r = session.post(f"{base}/api/v1/add_node",
                             json={"node_id": sr["resume_id"], "text": text, "node_type": "resume"},
                             timeout=30)
            r.raise_for_status()
            stats["nodes"] += 1
        except Exception as exc:
            logger.warning("add_node resume %s: %s", sr["resume_id"], exc)
            stats["errors"] += 1
        time.sleep(delay)

    # ── 2c. Interactions ──────────────────────────────────────────────────────
    logger.info("Replaying interactions...")
    jobs_by_industry: dict = {}
    for jr in job_records:
        jobs_by_industry.setdefault(jr["industry"], []).append(jr)

    for sr in seeker_records:
        seeker_skills  = set(sr["skills"])
        candidate_jobs = jobs_by_industry.get(sr["industry"], [])
        ranked = sorted(
            candidate_jobs,
            key=lambda j: len(set(j["must_skills"]) & seeker_skills),
            reverse=True,
        )
        for rank, jr in enumerate(ranked):
            overlap = len(set(jr["must_skills"]) & seeker_skills)
            if overlap < 1:
                continue
            if rank < 3:
                action_type = "apply"
            elif rank < 6:
                action_type = "save"
            elif rank < 11:
                action_type = "click"
            else:
                break
            try:
                if action_type == "apply":
                    # Apply events: create graph edge + update GraphSAGE
                    payload = {"resume_id": sr["resume_id"], "job_id": jr["job_id"], "action_type": action_type}
                    r = session.post(
                        f"{base}/api/v1/interact",
                        json=payload,
                        timeout=30,
                    )
                else:
                    # Click/Save events: user-level behavioral signals only (no graph edge)
                    payload = {"job_id": jr["job_id"], "action_type": action_type}
                    r = session.post(
                        f"{base}/api/v1/interact/behavioral",
                        json=payload,
                        headers={"X-User-ID": sr["seeker_id"]},
                        timeout=30,
                    )
                r.raise_for_status()
                stats["interactions"] += 1
            except Exception as exc:
                logger.warning("interact %s→%s (%s): %s", sr["resume_id"], jr["job_id"], action_type, exc)
                stats["errors"] += 1
            time.sleep(delay)

    logger.info(
        "AI sync complete — nodes=%d  interactions=%d  errors=%d",
        stats["nodes"], stats["interactions"], stats["errors"],
    )
    return stats


# ── DB connection ─────────────────────────────────────────────────────────────

def get_conn(db_url: str | None = None):
    if db_url:
        return psycopg2.connect(db_url)
    return psycopg2.connect(
        host     = os.getenv("POSTGRES_HOST",     "localhost"),
        port     = int(os.getenv("POSTGRES_PORT", "5432")),
        dbname   = os.getenv("POSTGRES_DB",       "recruitpro"),
        user     = os.getenv("POSTGRES_USER",     "recruitpro"),
        password = os.getenv("POSTGRES_PASSWORD", "changeme"),
    )


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed PostgreSQL then sync to AI service graph")
    parser.add_argument("--db-url",    default=None,
                        help="PostgreSQL DSN (overrides POSTGRES_* env vars)")
    parser.add_argument("--ai-url",    default="http://localhost:8000",
                        help="AI service base URL (default: http://localhost:8000)")
    parser.add_argument("--delay",     type=float, default=0.05,
                        help="Delay in seconds between AI HTTP calls (default: 0.05)")
    parser.add_argument("--skip-sync", action="store_true",
                        help="Insert into DB only; skip AI service sync")
    args = parser.parse_args()

    conn = get_conn(args.db_url)
    try:
        logger.info("=== Phase 1: Inserting synthetic data into PostgreSQL ===")
        job_records, seeker_records, db_stats = phase_db(conn)
        logger.info("DB totals: %s", db_stats)

        if not args.skip_sync:
            logger.info("=== Phase 2: Syncing to AI service at %s ===", args.ai_url)
            ai_stats = phase_sync(job_records, seeker_records, args.ai_url, args.delay)
            logger.info("AI totals: %s", ai_stats)
        else:
            logger.info("--skip-sync set; skipping AI service sync.")
    finally:
        conn.close()

    logger.info("Done.")


if __name__ == "__main__":
    main()
