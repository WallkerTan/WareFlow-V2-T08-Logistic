package com.example.inventory_service.security;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;
@Component
public class SupplierAccessClient {
    private final RestClient core;
    public SupplierAccessClient(@Value("${wareflow.core-service-url:http://localhost:8081}") String url){
        var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(5000);factory.setReadTimeout(10000);
        core=RestClient.builder().baseUrl(url).requestFactory(factory).build();
    }
    public void requireSupplier(String authorization,UUID id){
        if(id==null)return;
        try{core.get().uri("/suppliers/{id}",id).header(HttpHeaders.AUTHORIZATION,authorization).retrieve().toBodilessEntity();}
        catch(RestClientResponseException ex){int code=ex.getStatusCode().value();throw new ResponseStatusException(code==401||code==403||code==404?HttpStatus.valueOf(code):HttpStatus.SERVICE_UNAVAILABLE,"Nhà cung cấp không khả dụng hoặc không cùng ngành kinh doanh");}
        catch(RestClientException ex){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Không xác minh được nhà cung cấp");}
    }
}
