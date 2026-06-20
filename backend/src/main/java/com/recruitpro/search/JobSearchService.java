package com.recruitpro.search;

import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import com.recruitpro.config.ElasticsearchProperties;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.mapping.IndexCoordinates;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobSearchService {

    private static final List<String> SEARCH_FIELDS = List.of(
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

    private final ElasticsearchProperties properties;
    private final ElasticsearchOperations elasticsearchOperations;

    public JobSearchResult searchPublishedJobs(String keyword,
                                               JobType jobType,
                                               Set<ExperienceLevel> experienceLevels,
                                               String location,
                                               Double salaryMin,
                                               Double salaryMax,
                                               Long cityId,
                                               Long countryId,
                                               Pageable pageable) {
        if (!properties.isEnabled() || !StringUtils.hasText(keyword)) {
            return JobSearchResult.fallback();
        }

        try {
            NativeQuery query = NativeQuery.builder()
                    .withQuery(buildQuery(keyword, jobType, experienceLevels, location, salaryMin, salaryMax, cityId, countryId))
                    .withPageable(pageable)
                    .withSort(sort -> sort.score(score -> score.order(SortOrder.Desc)))
                    .withSort(sort -> sort.field(field -> field.field("createdAt").order(SortOrder.Desc)))
                    .build();

            SearchHits<JobSearchDocument> hits = elasticsearchOperations.search(
                    query,
                    JobSearchDocument.class,
                    IndexCoordinates.of(properties.getJobsIndex())
            );

            List<UUID> ids = hits.getSearchHits().stream()
                    .map(SearchHit::getContent)
                    .map(JobSearchDocument::getJobId)
                    .toList();

            return JobSearchResult.builder()
                    .fallbackRequired(false)
                    .jobIds(ids)
                    .total(hits.getTotalHits())
                    .build();
        } catch (Exception e) {
            log.warn("Elasticsearch job search failed; falling back to PostgreSQL: {}", e.getMessage());
            return JobSearchResult.fallback();
        }
    }

    Query buildQuery(String keyword,
                     JobType jobType,
                     Set<ExperienceLevel> experienceLevels,
                     String location,
                     Double salaryMin,
                     Double salaryMax,
                     Long cityId,
                     Long countryId) {
        List<Query> filters = new ArrayList<>();
        filters.add(term("status", JobStatus.PUBLISHED.name()));
        if (jobType != null) {
            filters.add(term("jobType", jobType.name()));
        }
        if (experienceLevels != null && !experienceLevels.isEmpty()) {
            filters.add(Query.of(q -> q.terms(t -> t.field("experienceLevels")
                    .terms(v -> v.value(experienceLevels.stream()
                            .map(level -> co.elastic.clients.elasticsearch._types.FieldValue.of(level.name()))
                            .toList())))));
        }
        if (cityId != null) {
            filters.add(term("cityId", cityId));
        }
        if (countryId != null) {
            filters.add(term("countryId", countryId));
        }
        if (StringUtils.hasText(location)) {
            filters.add(Query.of(q -> q.match(m -> m.field("location").query(location))));
        }
        if (salaryMin != null) {
            filters.add(Query.of(q -> q.range(r -> r.field("salaryMax").gte(co.elastic.clients.json.JsonData.of(salaryMin)))));
        }
        if (salaryMax != null) {
            filters.add(Query.of(q -> q.range(r -> r.field("salaryMin").lte(co.elastic.clients.json.JsonData.of(salaryMax)))));
        }

        Query fuzzyMatch = Query.of(q -> q.multiMatch(mm -> mm
                        .query(keyword)
                        .fields(SEARCH_FIELDS)
                        .fuzziness("AUTO")
                        .prefixLength(1)
        ));
        Query prefixMatch = Query.of(q -> q.multiMatch(mm -> mm
                .query(keyword)
                .fields(SEARCH_FIELDS)
                .type(TextQueryType.BoolPrefix)
        ));

        return Query.of(q -> q.bool(b -> b
                .should(fuzzyMatch)
                .should(prefixMatch)
                .minimumShouldMatch("1")
                .filter(filters)
        ));
    }

    private Query term(String field, String value) {
        return Query.of(q -> q.term(t -> t.field(field).value(value)));
    }

    private Query term(String field, Long value) {
        return Query.of(q -> q.term(t -> t.field(field).value(value)));
    }
}
