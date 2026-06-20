package com.recruitpro.search;

import com.recruitpro.config.ElasticsearchProperties;
import com.recruitpro.model.Company;
import com.recruitpro.model.CompanyAddress;
import com.recruitpro.model.Job;
import com.recruitpro.model.Skill;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.repository.CompanyAddressRepository;
import com.recruitpro.repository.CompanyRepository;
import com.recruitpro.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.data.elasticsearch.core.mapping.IndexCoordinates;
import org.springframework.data.elasticsearch.core.query.IndexQuery;
import org.springframework.data.elasticsearch.core.query.IndexQueryBuilder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobSearchIndexService {

    private final ElasticsearchProperties properties;
    private final ElasticsearchOperations elasticsearchOperations;
    private final JobRepository jobRepository;
    private final CompanyRepository companyRepository;
    private final CompanyAddressRepository companyAddressRepository;

    public boolean isEnabled() {
        return properties.isEnabled();
    }

    public void ensureIndex() {
        if (!properties.isEnabled()) {
            return;
        }
        try {
            createIndexIfMissing();
        } catch (Exception e) {
            log.warn("Could not create Elasticsearch job search index: {}", e.getMessage());
        }
    }

    public int syncJob(UUID jobId) {
        if (!properties.isEnabled() || jobId == null) {
            return 0;
        }
        try {
            ensureIndex();
            Optional<Job> job = jobRepository.findSearchablePublishedJobForIndex(jobId);
            if (job.isPresent()) {
                indexJob(job.get());
                return 1;
            } else {
                deleteJob(jobId);
                return 0;
            }
        } catch (Exception e) {
            log.warn("Could not sync job {} to Elasticsearch: {}", jobId, e.getMessage());
            return 0;
        }
    }

    public void indexJob(Job job) {
        if (!properties.isEnabled() || job == null || job.getId() == null) {
            return;
        }
        try {
            JobSearchDocument document = buildDocument(job);
            IndexQuery query = new IndexQueryBuilder()
                    .withId(job.getId().toString())
                    .withObject(document)
                    .build();
            elasticsearchOperations.index(query, index());
        } catch (Exception e) {
            log.warn("Could not index job {} in Elasticsearch: {}", job.getId(), e.getMessage());
        }
    }

    public int deleteJob(UUID jobId) {
        if (!properties.isEnabled() || jobId == null) {
            return 0;
        }
        try {
            elasticsearchOperations.delete(jobId.toString(), index());
            return 1;
        } catch (Exception e) {
            log.warn("Could not delete job {} from Elasticsearch: {}", jobId, e.getMessage());
            return 0;
        }
    }

    public int deleteCompanyJobs(UUID companyId) {
        if (!properties.isEnabled() || companyId == null) {
            return 0;
        }
        return jobRepository.findIdsByCompanyId(companyId).stream()
                .mapToInt(this::deleteJob)
                .sum();
    }

    public int reindexCompanyJobs(UUID companyId) {
        if (!properties.isEnabled() || companyId == null) {
            return 0;
        }
        int total = 0;
        int page = 0;
        Page<Job> batch;
        do {
            batch = jobRepository.findSearchablePublishedJobsByCompanyId(companyId, PageRequest.of(page++, 100));
            batch.getContent().forEach(this::indexJob);
            total += batch.getNumberOfElements();
        } while (batch.hasNext());
        return total;
    }

    public int syncCompanyJobs(UUID companyId) {
        if (!properties.isEnabled() || companyId == null) {
            return 0;
        }
        deleteCompanyJobs(companyId);
        return reindexCompanyJobs(companyId);
    }

    public boolean clearAll() {
        if (!properties.isEnabled()) {
            return false;
        }
        return recreateIndex();
    }

    public int reindexAll() {
        if (!properties.isEnabled()) {
            return 0;
        }
        recreateIndex();
        int total = 0;
        int page = 0;
        Page<Job> batch;
        do {
            batch = jobRepository.findSearchablePublishedJobsForIndex(PageRequest.of(page++, 100));
            batch.getContent().forEach(this::indexJob);
            total += batch.getNumberOfElements();
        } while (batch.hasNext());
        log.info("Reindexed {} jobs into Elasticsearch index {}", total, properties.getJobsIndex());
        return total;
    }

    private void createIndexIfMissing() {
        IndexOperations ops = elasticsearchOperations.indexOps(index());
        if (!ops.exists()) {
            ops.create();
            ops.putMapping(mapping());
            log.info("Created Elasticsearch job search index {}", properties.getJobsIndex());
        }
    }

    private boolean recreateIndex() {
        try {
            IndexOperations ops = elasticsearchOperations.indexOps(index());
            if (ops.exists()) {
                ops.delete();
            }
            ops.create();
            ops.putMapping(mapping());
            return true;
        } catch (Exception e) {
            log.warn("Could not recreate Elasticsearch job search index: {}", e.getMessage());
            return false;
        }
    }

    JobSearchDocument buildDocument(Job job) {
        Company company = companyRepository.findById(job.getCompanyId()).orElse(null);
        CompanyAddress address = job.getCompanyAddressId() != null
                ? companyAddressRepository.findById(job.getCompanyAddressId()).orElse(null)
                : null;

        return JobSearchDocument.builder()
                .jobId(job.getId())
                .companyId(job.getCompanyId())
                .companyName(company != null ? company.getName() : null)
                .jobType(job.getJobType() != null ? job.getJobType().name() : null)
                .experienceLevels(job.getExperienceLevels() != null
                        ? job.getExperienceLevels().stream().map(ExperienceLevel::name).toList()
                        : List.of())
                .cityId(address != null ? address.getCityId() : null)
                .countryId(address != null ? address.getCountryId() : null)
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .status(job.getStatus() != null ? job.getStatus().name() : JobStatus.DRAFT.name())
                .createdAt(job.getCreatedAt() != null ? job.getCreatedAt().toEpochMilli() : null)
                .updatedAt(job.getUpdatedAt() != null ? job.getUpdatedAt().toEpochMilli() : null)
                .title(job.getTitle())
                .skills(job.getSkills() != null ? job.getSkills().stream().map(Skill::getName).toList() : List.of())
                .industryName(job.getIndustry() != null ? job.getIndustry().getName() : null)
                .description(job.getDescription())
                .requirements(toList(job.getRequirements()))
                .responsibilities(toList(job.getResponsibilities()))
                .niceToHaveSkills(toList(job.getNiceToHaveSkills()))
                .location(StringUtils.hasText(job.getLocation()) ? job.getLocation() : formatAddress(address))
                .build();
    }

    private List<String> toList(String[] values) {
        return values != null ? Arrays.asList(values) : Collections.emptyList();
    }

    private String formatAddress(CompanyAddress address) {
        if (address == null) {
            return null;
        }
        return List.of(address.getAddressLine(), address.getCity(), address.getCountry()).stream()
                .filter(StringUtils::hasText)
                .reduce((left, right) -> left + ", " + right)
                .orElse(address.getLabel());
    }

    private IndexCoordinates index() {
        return IndexCoordinates.of(properties.getJobsIndex());
    }

    private org.springframework.data.elasticsearch.core.document.Document mapping() {
        return org.springframework.data.elasticsearch.core.document.Document.parse("""
                {
                  "properties": {
                    "jobId": { "type": "keyword" },
                    "companyId": { "type": "keyword" },
                    "companyName": {
                      "type": "text",
                      "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
                    },
                    "jobType": { "type": "keyword" },
                    "experienceLevels": { "type": "keyword" },
                    "cityId": { "type": "long" },
                    "countryId": { "type": "long" },
                    "salaryMin": { "type": "integer" },
                    "salaryMax": { "type": "integer" },
                    "status": { "type": "keyword" },
                    "createdAt": { "type": "date" },
                    "updatedAt": { "type": "date" },
                    "title": {
                      "type": "text",
                      "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
                    },
                    "skills": { "type": "text" },
                    "industryName": {
                      "type": "text",
                      "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
                    },
                    "description": { "type": "text" },
                    "requirements": { "type": "text" },
                    "responsibilities": { "type": "text" },
                    "niceToHaveSkills": { "type": "text" },
                    "location": {
                      "type": "text",
                      "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
                    }
                  }
                }
                """);
    }
}
