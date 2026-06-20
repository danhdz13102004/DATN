package com.recruitpro.search;

import com.recruitpro.config.ElasticsearchProperties;
import com.recruitpro.model.Company;
import com.recruitpro.model.CompanyAddress;
import com.recruitpro.model.Industry;
import com.recruitpro.model.Job;
import com.recruitpro.model.Skill;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;
import com.recruitpro.repository.CompanyAddressRepository;
import com.recruitpro.repository.CompanyRepository;
import com.recruitpro.repository.JobRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JobSearchIndexServiceTest {

    @Test
    void buildDocumentIncludesFilterableAndSearchableJobFields() {
        UUID jobId = UUID.randomUUID();
        UUID companyId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();

        CompanyRepository companyRepository = mock(CompanyRepository.class);
        CompanyAddressRepository addressRepository = mock(CompanyAddressRepository.class);

        when(companyRepository.findById(companyId)).thenReturn(Optional.of(Company.builder()
                .id(companyId)
                .name("Acme Labs")
                .build()));
        when(addressRepository.findById(addressId)).thenReturn(Optional.of(CompanyAddress.builder()
                .id(addressId)
                .companyId(companyId)
                .cityId(1L)
                .countryId(84L)
                .city("Ho Chi Minh City")
                .country("Vietnam")
                .build()));

        JobSearchIndexService service = new JobSearchIndexService(
                new ElasticsearchProperties(),
                mock(ElasticsearchOperations.class),
                mock(JobRepository.class),
                companyRepository,
                addressRepository
        );

        Job job = Job.builder()
                .id(jobId)
                .companyId(companyId)
                .companyAddressId(addressId)
                .title("Senior Java Engineer")
                .description("Build search features")
                .industry(Industry.builder().name("Software").build())
                .responsibilities(new String[]{"Design APIs"})
                .requirements(new String[]{"Java", "Spring Boot"})
                .niceToHaveSkills(new String[]{"Elasticsearch"})
                .experienceLevels(Set.of(ExperienceLevel.SENIOR))
                .location("District 1")
                .salaryMin(3000)
                .salaryMax(7000)
                .jobType(JobType.REMOTE)
                .status(JobStatus.PUBLISHED)
                .skills(Set.of(Skill.builder().name("Java").build(), Skill.builder().name("Elasticsearch").build()))
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .updatedAt(Instant.parse("2026-01-02T00:00:00Z"))
                .build();

        JobSearchDocument document = service.buildDocument(job);

        assertThat(document.getJobId()).isEqualTo(jobId);
        assertThat(document.getCompanyId()).isEqualTo(companyId);
        assertThat(document.getCompanyName()).isEqualTo("Acme Labs");
        assertThat(document.getCityId()).isEqualTo(1L);
        assertThat(document.getCountryId()).isEqualTo(84L);
        assertThat(document.getStatus()).isEqualTo("PUBLISHED");
        assertThat(document.getTitle()).isEqualTo("Senior Java Engineer");
        assertThat(document.getSkills()).containsExactlyInAnyOrder("Java", "Elasticsearch");
        assertThat(document.getIndustryName()).isEqualTo("Software");
        assertThat(document.getRequirements()).containsExactly("Java", "Spring Boot");
        assertThat(document.getResponsibilities()).containsExactly("Design APIs");
        assertThat(document.getNiceToHaveSkills()).containsExactly("Elasticsearch");
        assertThat(document.getLocation()).isEqualTo("District 1");
    }
}
