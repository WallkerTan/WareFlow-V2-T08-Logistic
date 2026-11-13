package com.example.core_service.service;
import com.example.core_service.repository.FinanceEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.client.RestClient;
import java.time.Instant;
import java.util.Map;
@Component @RequiredArgsConstructor @Slf4j
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="wareflow.finance-sync.enabled",havingValue="true",matchIfMissing=true)
public class FinanceEventWorker {
    private final FinanceEventRepository events;
    @Value("${INTERNAL_API_KEY:}") private String key;
    @Value("${FINANCE_SERVICE_URL:http://localhost:8083}") private String url;
    @Scheduled(fixedDelayString="${wareflow.finance-sync.interval-ms:30000}") @Transactional
    public void deliver(){
        if(key.isBlank())return;
        var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(5000);factory.setReadTimeout(10000);
        RestClient client=RestClient.builder().baseUrl(url).requestFactory(factory).build();
        for(var e:events.pending(Instant.now(),PageRequest.of(0,25))){
            try{client.post().uri("/internal/warehouse-charges").header("X-Internal-Key",key).body(Map.of("eventId",e.getId(),"companyId",e.getCompanyId(),"warehouseId",e.getWarehouseId(),"amount",e.getAmount(),"occurredAt",e.getOccurredAt())).retrieve().toBodilessEntity();e.setDeliveredAt(Instant.now());}
            catch(Exception ex){e.setAttempts(e.getAttempts()+1);e.setRetryAt(Instant.now().plusSeconds(Math.min(3600,30L*(1L<<Math.min(e.getAttempts(),7)))));log.warn("Finance event {} pending retry",e.getId());}
            events.save(e);
        }
    }
}
