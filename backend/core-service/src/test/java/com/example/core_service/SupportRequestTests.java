package com.example.core_service;

import com.example.core_service.repository.SupportRequestRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SupportRequestTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired SupportRequestRepository requests;
    @MockitoBean JavaMailSender mail;

    @Test
    void publicSubmissionCanBeAnsweredOnceAndRetriedAfterMailFailure() throws Exception {
        String address = UUID.randomUUID() + "@example.test";
        mvc.perform(post("/support-requests").contentType("application/json").content("""
                {"fullName":"Khách hàng","email":"%s","message":"Tôi cần hỗ trợ."}
                """.formatted(address))).andExpect(status().isCreated());
        mvc.perform(get("/support-requests")).andExpect(status().isUnauthorized());

        var login = mvc.perform(post("/auth/login").contentType("application/json").content("""
                {"email":"admin@wareflow.com","password":"admin123"}
                """)).andExpect(status().isOk()).andReturn();
        String admin = "Bearer " + json.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();
        var list = mvc.perform(get("/support-requests").header("Authorization", admin))
                .andExpect(status().isOk()).andReturn();
        var entry = json.readTree(list.getResponse().getContentAsString()).get("content").get(0);
        assertThat(entry.get("email").asText()).isEqualTo(address);
        UUID id = UUID.fromString(entry.get("id").asText());
        String path = "/support-requests/" + id + "/reply";
        String payload = """
                {"message":"WareFlow đã nhận được yêu cầu."}
                """;

        doThrow(new MailSendException("Unavailable")).doNothing().when(mail).send(any(SimpleMailMessage.class));
        mvc.perform(post(path).header("Authorization", admin).contentType("application/json").content(payload))
                .andExpect(status().isServiceUnavailable());
        assertThat(requests.findById(id).orElseThrow().getRepliedAt()).isNull();

        mvc.perform(post(path).header("Authorization", admin).contentType("application/json").content(payload))
                .andExpect(status().isOk()).andExpect(jsonPath("$.repliedAt").exists());
        mvc.perform(post(path).header("Authorization", admin).contentType("application/json").content(payload))
                .andExpect(status().isConflict());

        var messages = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail, times(2)).send(messages.capture());
        assertThat(messages.getValue().getTo()).containsExactly(address);
        assertThat(messages.getValue().getText()).isEqualTo("WareFlow đã nhận được yêu cầu.");
    }
}
