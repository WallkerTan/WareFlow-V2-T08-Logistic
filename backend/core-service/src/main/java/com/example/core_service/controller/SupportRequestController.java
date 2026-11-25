package com.example.core_service.controller;

import com.example.core_service.entity.SupportRequest;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.SupportRequestRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/support-requests")
@RequiredArgsConstructor
public class SupportRequestController {
    private final SupportRequestRepository requests;
    private final JavaMailSender mail;

    @Value("${SMTP_FROM:}")
    private String sender;

    public record Submission(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 254) @Pattern(regexp = "^[^\\s,;<>]+$") String email,
            @Size(max = 160) String companyName,
            @Pattern(regexp = "under_500|500_2000|above_2000|multiple") String warehouseSize,
            @NotBlank @Size(max = 3000) String message) {}

    public record Reply(@NotBlank @Size(max = 5000) String message) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void submit(@Valid @RequestBody Submission input) {
        requests.save(new SupportRequest(input.fullName(), input.email(), input.companyName(),
                input.warehouseSize(), input.message()));
    }

    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public PagedModel<SupportRequest> list(@RequestParam(defaultValue = "0") int page) {
        if (page < 0) throw ApiException.badRequest("Trang không hợp lệ.");
        return new PagedModel<>(requests.findAll(PageRequest.of(page, 20,
                Sort.by(Sort.Direction.DESC, "createdAt", "id"))));
    }

    @PostMapping("/{id}/reply")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Transactional
    public SupportRequest reply(@PathVariable UUID id, @Valid @RequestBody Reply input) {
        SupportRequest request = requests.findByIdAndRepliedAtIsNull(id).orElseThrow(() ->
                requests.existsById(id) ? ApiException.conflict("Yêu cầu này đã được trả lời.")
                        : ApiException.notFound("Không tìm thấy yêu cầu hỗ trợ."));
        String reply = input.message().strip();
        SimpleMailMessage email = new SimpleMailMessage();
        if (!sender.isBlank()) email.setFrom(sender);
        email.setTo(request.getEmail());
        email.setSubject("WareFlow - Phản hồi yêu cầu hỗ trợ");
        email.setText(reply);
        try {
            mail.send(email);
        } catch (MailException failure) {
            throw ApiException.serviceUnavailable("Không gửi được email. Vui lòng thử lại.");
        }

        request.markReplied(reply);
        return request;
    }
}
