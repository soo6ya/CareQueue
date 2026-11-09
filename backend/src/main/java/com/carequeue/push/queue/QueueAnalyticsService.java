
package com.carequeue.push.queue;

import com.carequeue.push.consultation.Consultation;
import com.carequeue.push.consultation.ConsultationRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QueueAnalyticsService {

    private static final ZoneId ZONE =
        ZoneId.of("Asia/Kolkata");

    private final QueueTicketRepository ticketRepository;
    private final ConsultationRepository consultationRepository;
    private final QueueStateRepository stateRepository;
    private final ObjectMapper mapper;

    public QueueAnalyticsService(
        QueueTicketRepository ticketRepository,
        ConsultationRepository consultationRepository,
        QueueStateRepository stateRepository,
        ObjectMapper mapper
    ) {
        this.ticketRepository = ticketRepository;
        this.consultationRepository = consultationRepository;
        this.stateRepository = stateRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public QueueAnalyticsResponse getTodayAnalytics() {

        // Calculate today's boundaries in Indian Standard Time.
        LocalDate today = LocalDate.now(ZONE);

        Instant start = today
            .atStartOfDay(ZONE)
            .toInstant();

        Instant end = today
            .plusDays(1)
            .atStartOfDay(ZONE)
            .toInstant();

        // Retrieve today's patient arrivals.
        List<QueueTicket> todaysTickets =
            ticketRepository
                .findByJoinedAtGreaterThanEqualAndJoinedAtLessThanOrderByJoinedAtAsc(
                    start,
                    end
                );

        // Retrieve today's completed consultations.
        List<Consultation> todaysConsultations =
            consultationRepository
                .findByCompletedAtGreaterThanEqualAndCompletedAtLessThanOrderByCompletedAtAsc(
                    start,
                    end
                );

        // Count hourly patient arrivals.
        int[] hourlyCounts = new int[24];

        for (QueueTicket ticket : todaysTickets) {

            int hour = ticket.getJoinedAt()
                .atZone(ZONE)
                .getHour();

            hourlyCounts[hour]++;
        }

        List<HourlyArrival> hourlyArrivals =
            new ArrayList<>();

        for (int hour = 0; hour < 24; hour++) {

            String label = String.format(
                "%02d:00",
                hour
            );

            hourlyArrivals.add(
                new HourlyArrival(
                    label,
                    hourlyCounts[hour]
                )
            );
        }

        // Read the current active queue's waiting tokens.
        QueueState state = stateRepository.findById(1L)
            .orElse(null);

        int currentlyWaiting = 0;

        if (state != null) {

            try {
                List<Integer> waitingTokens =
                    mapper.readValue(
                        state.getWaitingTokensJson(),
                        new TypeReference<List<Integer>>() {}
                    );

                currentlyWaiting = waitingTokens.size();

            } catch (Exception ex) {
                throw new IllegalStateException(
                    "Could not read current waiting queue for analytics.",
                    ex
                );
            }
        }

        return new QueueAnalyticsResponse(
            today.toString(),
            todaysTickets.size(),
            todaysConsultations.size(),
            currentlyWaiting,
            hourlyArrivals
        );
    }

    public record QueueAnalyticsResponse(
        String date,
        int totalPatientsJoined,
        int completedConsultations,
        int currentlyWaiting,
        List<HourlyArrival> hourlyArrivals
    ) {
    }

    public record HourlyArrival(
        String hour,
        int count
    ) {
    }
}
