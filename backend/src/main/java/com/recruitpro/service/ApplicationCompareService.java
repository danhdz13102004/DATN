package com.recruitpro.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.recruitpro.config.OpenAiConfig;
import com.recruitpro.dto.ResumeDataStructure;
import com.recruitpro.dto.response.ApplicationCompareResponseDto;
import com.recruitpro.exception.BadRequestException;
import com.recruitpro.exception.ForbiddenException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Job;
import com.recruitpro.model.Resume;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.repository.JobRepository;
import com.recruitpro.repository.ResumeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ApplicationCompareService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String SYSTEM_PROMPT = """
            You are an expert technical recruiter and career coach speaking directly to the job seeker.
            Compare the structured CV data with the structured job data.
            Return a single JSON object only, with no markdown and no extra explanation.

            JSON schema:
            {
              "overall_score": <integer 0-100>,
              "verdict": "<Strong match | Good match | Partial match | Weak match>",
              "summary": "<2-3 sentence explanation written directly to the applicant>",
              "strengths": ["specific reason your CV fits", ...],
              "gaps": ["specific missing or weak requirement in your CV", ...],
              "suggestions": ["actionable improvement you can make before applying", ...],
              "matched_skills": ["skill", ...],
              "missing_skills": ["skill", ...]
            }

            Rules:
            - Speak directly to the applicant using "you" and "your".
            - Do NOT talk about the applicant in third person and do NOT use their name.
            - Avoid phrases like "the candidate", "he", "she", "they", or "<name> has".
            - Example style: "You have strong React experience..." not "Nguyen Van A has strong React experience..."
            - Base the score on skills, responsibilities, seniority, years of experience, industry, and role alignment.
            - Be honest but helpful. Do not invent experience or skills not present in the CV.
            - Keep each list to 3-6 concise items.
            - overall_score must be an integer from 0 to 100.
            - Use the same language as the job/CV content when it is obvious; otherwise use English.
            """;

    private final RestTemplate restTemplate;
    private final OpenAiConfig openAiConfig;
    private final ResumeRepository resumeRepository;
    private final JobRepository jobRepository;
    private final OpenAiResumeStructuringService resumeStructuringService;

    public ApplicationCompareService(
            @Qualifier("openAiRestTemplate") RestTemplate restTemplate,
            OpenAiConfig openAiConfig,
            ResumeRepository resumeRepository,
            JobRepository jobRepository,
            OpenAiResumeStructuringService resumeStructuringService) {
        this.restTemplate = restTemplate;
        this.openAiConfig = openAiConfig;
        this.resumeRepository = resumeRepository;
        this.jobRepository = jobRepository;
        this.resumeStructuringService = resumeStructuringService;
    }

    public ApplicationCompareResponseDto compare(UUID seekerId, UUID jobId, UUID resumeId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found"));
        if (!resume.getJobSeekerId().equals(seekerId)) {
            throw new ForbiddenException("You do not own this resume");
        }

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        if (job.getStatus() != JobStatus.PUBLISHED) {
            throw new BadRequestException("This job is not accepting applications");
        }

        ResumeDataStructure resumeData = ensureResumeData(resume);
        Map<String, Object> jobData = buildJobData(job);

        if (openAiConfig.getApiKey() == null || openAiConfig.getApiKey().isBlank()) {
            throw new BadRequestException("OpenAI API key is not configured");
        }

        String baseUrl = openAiConfig.getBaseUrl();
        if (baseUrl == null || baseUrl.isBlank() || !baseUrl.startsWith("http")) {
            throw new BadRequestException("OpenAI base URL is not configured");
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("resume", resumeData);
            payload.put("job", jobData);

            Map<String, Object> requestBody = buildRequestBody(MAPPER.writeValueAsString(payload));
            ResponseEntity<String> response =
                    restTemplate.postForEntity(baseUrl + "/chat/completions", requestBody, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("[OpenAI] Unexpected status for application compare: {}", response.getStatusCode());
                throw new BadRequestException("Failed to compare CV with this job");
            }

            return parseResponse(response.getBody());
        } catch (JsonProcessingException ex) {
            log.error("[OpenAI] Failed to serialize comparison payload: {}", ex.getMessage());
            throw new BadRequestException("Failed to prepare comparison data");
        } catch (RestClientException ex) {
            log.error("[OpenAI] Application compare HTTP call failed: {}", ex.getMessage());
            throw new BadRequestException("Failed to compare CV with this job");
        }
    }

    private ResumeDataStructure ensureResumeData(Resume resume) {
        if (resume.getResumeDataStructure() != null) {
            return resume.getResumeDataStructure();
        }

        if (resume.getParsedText() == null || resume.getParsedText().isBlank()) {
            throw new BadRequestException("This CV is still being processed. Please try again later.");
        }

        ResumeDataStructure structured = resumeStructuringService.structure(resume.getParsedText());
        if (structured == null) {
            throw new BadRequestException("This CV could not be analyzed yet. Please try again later.");
        }

        resume.setResumeDataStructure(structured);
        resumeRepository.save(resume);
        return structured;
    }

    private Map<String, Object> buildJobData(Job job) {
        if (job.getJobDataStructure() != null && !job.getJobDataStructure().isEmpty()) {
            return job.getJobDataStructure();
        }

        Map<String, Object> data = new HashMap<>();
        data.put("job_title", job.getTitle());
        data.put("description", job.getDescription());
        data.put("job_type", job.getJobType() != null ? job.getJobType().name() : null);
        data.put("experience_levels", job.getExperienceLevels() != null
                ? job.getExperienceLevels().stream().map(Enum::name).collect(Collectors.toList())
                : List.of());
        data.put("location", job.getLocation());
        data.put("salary_min", job.getSalaryMin());
        data.put("salary_max", job.getSalaryMax());
        data.put("industry", job.getIndustry() != null ? job.getIndustry().getName() : null);
        data.put("responsibilities", job.getResponsibilities() != null ? Arrays.asList(job.getResponsibilities()) : List.of());
        data.put("requirements", job.getRequirements() != null ? Arrays.asList(job.getRequirements()) : List.of());
        data.put("must_have_skills", job.getSkills() != null
                ? job.getSkills().stream().map(skill -> skill.getName()).collect(Collectors.toList())
                : List.of());
        data.put("nice_to_have_skills", job.getNiceToHaveSkills() != null ? Arrays.asList(job.getNiceToHaveSkills()) : List.of());
        return data;
    }

    private Map<String, Object> buildRequestBody(String userContent) {
        return Map.of(
                "model", openAiConfig.getModel(),
                "temperature", 0,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", userContent)
                )
        );
    }

    private ApplicationCompareResponseDto parseResponse(String responseBody) {
        try {
            JsonNode root = MAPPER.readTree(responseBody);
            String content = root.path("choices").get(0)
                    .path("message").path("content").asText();
            return MAPPER.readValue(content, ApplicationCompareResponseDto.class);
        } catch (JsonProcessingException | NullPointerException ex) {
            log.error("[OpenAI] Failed to parse application comparison response: {}", ex.getMessage());
            throw new BadRequestException("Failed to parse CV comparison result");
        }
    }
}
