
package com.carequeue.push.queue;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class QueueAnalyticsController {

    private final QueueAnalyticsService analyticsService;

    public QueueAnalyticsController(
        QueueAnalyticsService analyticsService
    ) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/queue-analytics")
    public ResponseEntity<QueueAnalyticsService.QueueAnalyticsResponse>
            getTodayAnalytics() {

        return ResponseEntity.ok(
            analyticsService.getTodayAnalytics()
        );
    }
}
