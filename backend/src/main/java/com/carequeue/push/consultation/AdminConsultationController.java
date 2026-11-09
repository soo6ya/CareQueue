
package com.carequeue.push.consultation;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/consultations")
@CrossOrigin(origins = "${app.frontend-origin:http://localhost:5173}")
public class AdminConsultationController {

    private final ConsultationService consultationService;

    public AdminConsultationController(
        ConsultationService consultationService
    ) {
        this.consultationService = consultationService;
    }

    @GetMapping
    public ResponseEntity<List<ConsultationService.ConsultationResponse>>
    getAllConsultations() {

        List<ConsultationService.ConsultationResponse> consultations =
            consultationService.getAllConsultations();

        return ResponseEntity.ok(consultations);
    }
}
