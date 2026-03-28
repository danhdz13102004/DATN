package com.recruitpro.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponseDto {
    private long totalJobs;
    private long activeApplications;
    private long interviewsThisWeek;
    private long newMessagesUnread;
    private long unreadNotifications;

    private TrendDto trends;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendDto {
        private int jobsTrend;              // percentage change vs last period
        private int applicationsTrend;
        private int interviewsTrend;
    }
}
