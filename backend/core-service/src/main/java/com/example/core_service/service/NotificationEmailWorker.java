package com.example.core_service.service;
import com.example.core_service.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import java.time.Instant;

@Component @ConditionalOnProperty(name="wareflow.email.enabled",havingValue="true")
@RequiredArgsConstructor @Slf4j
public class NotificationEmailWorker {
    private final NotificationRepository notifications;
    private final JavaMailSender mail;
    @Value("${wareflow.email.from}") private String from;
    @Scheduled(fixedDelayString="${wareflow.email.interval-ms:60000}") @Transactional
    public void deliver(){
        for(var n:notifications.pendingEmail(Instant.now(),PageRequest.of(0,25))){
            try{
                SimpleMailMessage message=new SimpleMailMessage();message.setFrom(from);message.setTo(n.getRecipient().getEmail());
                message.setSubject("WareFlow - "+n.getTitle());message.setText(n.getTitle()+"\n\nVui lòng đăng nhập WareFlow để xem chi tiết.");
                mail.send(message);n.setEmailSentAt(Instant.now());
            }catch(Exception ex){n.setEmailAttempts(n.getEmailAttempts()+1);n.setEmailRetryAt(Instant.now().plusSeconds(Math.min(3600,60L*(1L<<Math.min(n.getEmailAttempts(),6)))));log.warn("Email delivery failed for notification {}",n.getId());}
            notifications.save(n);
        }
    }
}
