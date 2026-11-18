package com.example.core_service;

import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.repository.UserRepository;
import com.example.core_service.service.PasswordResetService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PasswordResetTests {
    @Autowired UserRepository users;
    @Autowired PasswordResetService service;
    @Autowired PasswordEncoder encoder;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean JavaMailSender mail;

    private User create(UserRole role) {
        return users.save(User.builder().role(role).email(UUID.randomUUID() + "@example.test")
                .passwordHash(encoder.encode("oldPassword")).build());
    }

    private void postAuth(String path, Map<String, String> body, int statusCode) throws Exception {
        mvc.perform(post("/auth/" + path).contentType("application/json").content(json.writeValueAsString(body)))
                .andExpect(status().is(statusCode));
    }

    @Test
    void recoverBothRolesAndLogin() throws Exception {
        for (UserRole role : new UserRole[]{UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_MANAGER}) {
            User user = create(role);
            String email = user.getEmail();
            postAuth("forgot-password", Map.of("email", email), 202);
            var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
            verify(mail).send(message.capture());
            assertThat(message.getValue().getTo()).containsExactly(email);
            var match = Pattern.compile("\\b[0-9]{6}\\b").matcher(message.getValue().getText());
            assertThat(match.find()).isTrue();
            var payload = Map.of("email", email, "otp", match.group(), "newPassword", "newPassword");
            postAuth("reset-password", payload, 204);
            postAuth("reset-password", payload, 400);
            postAuth("login", Map.of("email", email, "password", "oldPassword"), 401);
            postAuth("login", Map.of("email", email, "password", "newPassword"), 200);
            clearInvocations(mail);
        }
    }

    @Test
    void excludesAdminAndUnknownEmail() throws Exception {
        for (String email : new String[]{create(UserRole.SYSTEM_ADMIN).getEmail(), "unknown@example.test"}) {
            postAuth("forgot-password", Map.of("email", email), 202);
            postAuth("reset-password", Map.of("email", email, "otp", "000000", "newPassword", "newPassword"), 400);
        }
        verifyNoInteractions(mail);
    }

    private User challenge(long seconds) {
        User user = create(UserRole.COMPANY_ADMIN);
        user.setResetCodeHash(encoder.encode("000123"));
        user.setResetCodeExpiresAt(Instant.now().plusSeconds(seconds));
        user.setResetAttempts(0);
        return users.save(user);
    }

    @Test
    void expiryFailuresAndResend() {
        User user = challenge(-1);
        String email = user.getEmail();
        assertThat(service.confirm(email, "000123", "newPassword")).isFalse();
        doThrow(new MailSendException("test")).doNothing().when(mail).send(any(SimpleMailMessage.class));
        service.request(email);
        assertThat(users.findById(user.getId()).orElseThrow().getResetCodeHash()).isEqualTo(user.getResetCodeHash());
        service.request(email);
        service.request(email);
        verify(mail, times(2)).send(any(SimpleMailMessage.class));

        User active = challenge(590);
        for (int i = 0; i < 5; i++)
            assertThat(service.confirm(active.getEmail(), "111111", "newPassword")).isFalse();
        assertThat(service.confirm(active.getEmail(), "000123", "newPassword")).isFalse();
    }

    @Test
    void onlyOneConcurrentConfirmationSucceeds() throws Exception {
        String email = challenge(590).getEmail();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> service.confirm(email, "000123", "newPassword"));
            var second = pool.submit(() -> service.confirm(email, "000123", "newPassword"));
            assertThat(first.get() ^ second.get()).isTrue();
        }
    }
}
