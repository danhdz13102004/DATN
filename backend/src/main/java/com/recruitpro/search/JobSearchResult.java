package com.recruitpro.search;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class JobSearchResult {

    private boolean fallbackRequired;
    private List<UUID> jobIds;
    private long total;

    public static JobSearchResult fallback() {
        return JobSearchResult.builder()
                .fallbackRequired(true)
                .jobIds(List.of())
                .total(0)
                .build();
    }
}
