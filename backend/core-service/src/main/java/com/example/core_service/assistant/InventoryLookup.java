package com.example.core_service.assistant;

import java.util.Optional;
import java.util.regex.Pattern;
import static com.example.core_service.assistant.AssistantModel.Action.*;

final class InventoryLookup {
    private InventoryLookup() {}
    private static final Pattern EXPIRY = Pattern.compile("(?:cac |nhung )?(?:lo(?: hang)?|hang hoa|san pham)(?: nao)? (?:sap )?het han (?:trong )?(\\d{1,4}) ngay(?: toi)?");
    private static final Pattern LOT = Pattern.compile("(?:tim |tra cuu |kiem tra )?(?:ma )?lo (.+)");
    private static final Pattern PRODUCT = Pattern.compile("(?:tim |tra cuu |kiem tra )?(?:hang hoa |san pham |sku |ma hang |ton kho |so luong kha dung |kha dung )(.+)");
    private static final Pattern COMPLEX = Pattern.compile("\\b(nhap|xuat|ban|mua|cap nhat|sua|doi|tang|giam|thue|dieu chinh|lap phieu|kho nao|kho nay|tai kho|trong kho|het han|nay|bao nhieu|sap het|duoi muc|thap hon|qua han|bi hong|het hang|con hang|het ton)\\b");

    static Optional<AssistantModel.Intent> parse(String message) {
        String text = AssistantController.fold(message).replaceAll("[?!.]+$", "").replaceAll("\\s+", " ").trim();
        var expiry = EXPIRY.matcher(text.replaceFirst("^(?:kiem tra|tim|liet ke|cho toi biet) ", ""));
        if (expiry.matches()) return Optional.of(intent(LOTS,null,null,Integer.valueOf(expiry.group(1))));
        var quantity = Pattern.compile("(.+?) (?:con bao nhieu|ton bao nhieu|kha dung bao nhieu)(?: (?:san pham|cai))?").matcher(text);
        if (quantity.matches()) text = quantity.group(1);
        if (COMPLEX.matcher(text).find() || text.matches(".*\\b(?:kho|gia|giao dich|don hang|nha cung cap)\\b.*")
                && !text.startsWith("ton kho ")) return Optional.empty();
        var lot = LOT.matcher(text);
        if (lot.matches()) return Optional.of(intent(LOTS,null,lot.group(1),null));
        var product = PRODUCT.matcher(text);
        if (product.matches()) text = product.group(1);
        else if (!quantity.matches() && !text.startsWith("tim ")) return Optional.empty();
        else text = text.replaceFirst("^tim (?:kiem )?", "");
        if (text.isBlank() || text.length()>120 || text.split(" ").length>12) return Optional.empty();
        return Optional.of(product(text));
    }
    static Optional<AssistantModel.Intent> offline(String message, AssistantController.Selection selected) {
        String text = AssistantController.fold(message).replaceAll("[?!.]+$", "").trim();
        String reply = switch (text) {
            case "xin chao", "chao", "chao ban", "hello", "hi" -> "Chào bạn! Bạn muốn tra sản phẩm, số lượng tồn hay hạn dùng của lô nào?";
            case "cam on", "cam on ban" -> "Rất vui được hỗ trợ bạn.";
            default -> null;
        };
        if (reply != null) return Optional.of(new AssistantModel.Intent(CHAT,null,null,null,null,null,null,false,
                null,null,null,null,null,null,null,null,null,reply));
        boolean nearExpiry = text.matches("(?:cac )?lo(?: nao)? sap het han");
        if (nearExpiry || text.matches("(?:cac )?lo(?: cua san pham nay)?|han dung(?: cua lo nay)?")) {
            return Optional.of(new AssistantModel.Intent(LOTS,null,null,null,null,nearExpiry ? "near_expiry" : null,null,
                    selected != null || !nearExpiry,null,null,null,null,null,null,null,null,null,null));
        }
        return parse(message);
    }

    static AssistantModel.Intent product(String term) {
        return intent(SEARCH,term,null,null);
    }
    private static AssistantModel.Intent intent(AssistantModel.Action action,String query,String lot,Integer days) {
        return new AssistantModel.Intent(action,query,null,lot,days,null,null,false,null,null,null,null,null,null,null,null,null,null);
    }
}
