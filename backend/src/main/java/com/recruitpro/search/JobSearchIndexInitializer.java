package com.recruitpro.search;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JobSearchIndexInitializer {

    private final JobSearchIndexService jobSearchIndexService;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureJobSearchIndex() {
        jobSearchIndexService.ensureIndex();
    }
}
