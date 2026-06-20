package com.recruitpro.search;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class JobSearchSyncListener {

    private final JobSearchIndexService jobSearchIndexService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onJobChanged(JobSearchSyncEvent event) {
        jobSearchIndexService.syncJob(event.jobId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCompanyBlockChanged(CompanyJobSearchSyncEvent event) {
        if (event.blocked()) {
            jobSearchIndexService.deleteCompanyJobs(event.companyId());
        } else {
            jobSearchIndexService.reindexCompanyJobs(event.companyId());
        }
    }
}
