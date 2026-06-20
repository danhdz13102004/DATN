package com.recruitpro.search;

import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import com.recruitpro.config.ElasticsearchProperties;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobType;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.mapping.IndexCoordinates;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;

class JobSearchServiceTest {

    @Test
    void buildQueryUsesWeightedRichKeywordFieldsAndFilters() {
        JobSearchService service = new JobSearchService(new ElasticsearchProperties(), mock(ElasticsearchOperations.class));

        Query query = service.buildQuery(
                "java backend",
                JobType.REMOTE,
                Set.of(ExperienceLevel.SENIOR),
                "Ho Chi Minh",
                3000.0,
                7000.0,
                10L,
                84L
        );

        assertThat(query.isBool()).isTrue();
        assertThat(query.bool().should()).hasSize(2);
        assertThat(query.bool().minimumShouldMatch()).isEqualTo("1");
        var multiMatch = query.bool().should().get(0).multiMatch();
        assertThat(multiMatch.fields())
                .containsExactly(
                        "title^5",
                        "skills^4",
                        "companyName^2",
                        "industryName^2",
                        "requirements^2",
                        "responsibilities",
                        "description",
                        "niceToHaveSkills",
                        "location"
                );
        assertThat(multiMatch.fuzziness()).isEqualTo("AUTO");
        assertThat(multiMatch.prefixLength()).isEqualTo(1);
        var prefixMatch = query.bool().should().get(1).multiMatch();
        assertThat(prefixMatch.type()).isEqualTo(co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType.BoolPrefix);
        assertThat(query.bool().filter()).hasSize(8);
        assertThat(query.bool().filter().stream().filter(Query::isTerm).count()).isEqualTo(4);
        assertThat(query.bool().filter().stream().filter(Query::isTerms).count()).isEqualTo(1);
        assertThat(query.bool().filter().stream().filter(Query::isMatch).count()).isEqualTo(1);
        assertThat(query.bool().filter().stream().filter(Query::isRange).count()).isEqualTo(2);
    }

    @Test
    void searchFallsBackWhenElasticsearchIsDisabled() {
        ElasticsearchProperties properties = new ElasticsearchProperties();
        properties.setEnabled(false);
        ElasticsearchOperations operations = mock(ElasticsearchOperations.class);
        JobSearchService service = new JobSearchService(properties, operations);

        JobSearchResult result = service.searchPublishedJobs(
                "java",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                PageRequest.of(0, 10)
        );

        assertThat(result.isFallbackRequired()).isTrue();
        assertThat(result.getJobIds()).isEmpty();
        verifyNoInteractions(operations);
    }

    @Test
    void searchFallsBackWhenElasticsearchThrows() {
        ElasticsearchProperties properties = new ElasticsearchProperties();
        properties.setEnabled(true);
        ElasticsearchOperations operations = mock(ElasticsearchOperations.class);
        when(operations.search(any(NativeQuery.class), eq(JobSearchDocument.class), any(IndexCoordinates.class)))
                .thenThrow(new RuntimeException("boom"));
        JobSearchService service = new JobSearchService(properties, operations);

        JobSearchResult result = service.searchPublishedJobs(
                "java",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                PageRequest.of(0, 10)
        );

        assertThat(result.isFallbackRequired()).isTrue();
        assertThat(result.getJobIds()).isEmpty();
    }
}
