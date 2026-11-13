package com.example.core_service.service;
import com.example.core_service.entity.enums.CompanyBusinessModel;
import java.text.Normalizer;
import java.util.Locale;
public final class BusinessClassifier {
    private BusinessClassifier(){}
    public static CompanyBusinessModel classify(String description){
        String s=Normalizer.normalize(description==null?"":description,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replace('đ','d');
        if(s.matches(".*(thuc pham|nong san|do uong|food|beverage).*"))return CompanyBusinessModel.FOOD;
        if(s.matches(".*(cong nghe|dien tu|phan mem|technology|computer).*"))return CompanyBusinessModel.TECH;
        if(s.matches(".*(gia dung|noi that|appliance|furniture).*"))return CompanyBusinessModel.APPLIANCE;
        if(s.matches(".*(thoi trang|quan ao|giay dep|fashion|clothing).*"))return CompanyBusinessModel.FASHION;
        return CompanyBusinessModel.OTHER;
    }
}
