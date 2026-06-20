package com.recruitpro.search;

import java.util.UUID;

public record CompanyJobSearchSyncEvent(UUID companyId, boolean blocked) {
}
