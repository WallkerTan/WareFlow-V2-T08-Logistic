package com.example.inventory_service.service;

import com.example.inventory_service.entity.*;
import com.example.inventory_service.entity.enums.StockLotStatus;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.*;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class TradeService {
    private final TradeBatchRepository batches;
    private final TradeOperationRepository operations;
    private final ProductRepository products;
    private final StockLotRepository lots;
    private final StockMovementRepository movements;
    private final TradeClient client;
    private final JdbcTemplate jdbc;
    public record BatchLine(@NotNull UUID supplierId,@NotNull UUID productId,
                            @NotNull @DecimalMin("0.01") @Digits(integer=10,fraction=2) BigDecimal quantity,
                            @NotNull @DecimalMin("0") @Digits(integer=10,fraction=2) BigDecimal minStock) {}
    public record BatchRequest(@NotEmpty List<@Valid BatchLine> lines) {}
    public record ImportRequest(@NotNull UUID id,@NotEmpty List<@NotNull UUID> batchIds) {}
    public record OutLine(@NotNull UUID lotId,@NotNull @DecimalMin("0.01") @Digits(integer=10,fraction=2) BigDecimal quantity,
                          @DecimalMin("0") @DecimalMax("500") BigDecimal percentage) {}
    public record OutRequest(@NotNull UUID id,@NotBlank String kind,UUID targetWarehouseId,
                             @NotEmpty List<@Valid OutLine> lines,String recipientName,String recipientAddress,String recipientPhone,String note) {}

    private void companyLock(UUID company) {
        if(company==null) bad("Tài khoản chưa thuộc công ty");
        jdbc.update("insert into trade_companies(company_id,batch_sequence) values (?,0) on conflict do nothing",company);
        jdbc.queryForObject("select id from trade_companies where company_id=? for update",Long.class,company);
    }
    public TradeBatch createBatch(BatchRequest request,UserIdentity user,String auth) {
        companyLock(user.companyId());
        List<Map<String,Object>> lines=new ArrayList<>(); Set<String> seen=new HashSet<>();
        Map<UUID,List<Map<String,Object>>> catalogs=new HashMap<>();
        for(var line:request.lines()) {
            String identity=line.supplierId()+":"+line.productId();
            if(!seen.add(identity)) bad("Sản phẩm bị trùng trong lô");
            var catalog=catalogs.computeIfAbsent(line.supplierId(),id->client.catalog(id,auth));
            var source=catalog.stream().filter(p->line.productId().toString().equals(String.valueOf(p.get("id")))).findFirst()
                    .orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Sản phẩm không thuộc nhà cung cấp đã chọn"));
            Map<String,Object> row=new LinkedHashMap<>();
            for(String key:List.of("sku","name","unit","barcode","image")) row.put(key,Objects.toString(source.get(key),""));
            row.put("supplierId",line.supplierId().toString());row.put("supplierProductId",line.productId().toString());
            row.put("quantity",line.quantity());row.put("minStock",line.minStock());
            row.put("unitPrice",decimal(source.get("price")));row.put("total",money(line.quantity().multiply(decimal(source.get("price")))));
            lines.add(row);
        }
        Long number=jdbc.queryForObject("select id from trade_companies where company_id=?",Long.class,user.companyId());
        jdbc.update("update trade_companies set batch_sequence=batch_sequence+1 where company_id=?",user.companyId());
        Long sequence=jdbc.queryForObject("select batch_sequence from trade_companies where company_id=?",Long.class,user.companyId());
        var batch=new TradeBatch();batch.setCompanyId(user.companyId());batch.setCode("LH"+number+"-"+String.format(Locale.ROOT,"%02d",sequence));batch.setLines(lines);
        return batches.save(batch);
    }
    @Transactional(readOnly=true)
    public List<TradeBatch> batches(UUID company) { return batches.findByCompanyIdOrderByCreatedAtDesc(company); }
    @Transactional(readOnly=true)
    public List<TradeOperation> list(UUID warehouse) { return operations.findByWarehouseIdOrderByCreatedAtDesc(warehouse); }

    public TradeOperation createImport(UUID warehouse,ImportRequest request,UserIdentity user) {
        companyLock(user.companyId());
        var existing=operations.findById(request.id());
        if(existing.isPresent()) {
            var op=owned(existing.get(),warehouse,user.companyId());
            if(!op.getKind().equals("IMPORT") || !new HashSet<>(strings(op.getDetails().get("batchIds"))).equals(new HashSet<>(request.batchIds().stream().map(UUID::toString).toList())))
                conflict("Mã yêu cầu đã sử dụng");
            return op;
        }
        if(new HashSet<>(request.batchIds()).size()!=request.batchIds().size())bad("Không chọn trùng lô hàng");
        List<Map<String,Object>> lines=new ArrayList<>();
        for(UUID id:request.batchIds().stream().sorted().toList()) {
            var batch=batches.lock(id,user.companyId()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy lô"));
            if(!batch.getStatus().equals("READY"))conflict("Lô "+batch.getCode()+" đã được chọn nhập");
            batch.setStatus("RESERVED");
            for(var row:batch.getLines()) { var line=new LinkedHashMap<>(row);line.put("batchId",id.toString());line.put("batchCode",batch.getCode());lines.add(line); }
        }
        var op=new TradeOperation();op.setId(request.id());op.setCompanyId(user.companyId());op.setWarehouseId(warehouse);op.setCreatedBy(user.id());op.setKind("IMPORT");
        op.setWarehousePayment(user.role().equals("WAREHOUSE_MANAGER"));op.setStatus(op.isWarehousePayment()?"PENDING_APPROVAL":"PAYMENT_PENDING");
        op.setLines(lines);op.setAmount(total(lines));op.setDetails(new LinkedHashMap<>(Map.of("batchIds",request.batchIds().stream().map(UUID::toString).toList())));
        return operations.save(op);
    }

    public TradeOperation createOutbound(UUID warehouse,OutRequest request,UserIdentity user) {
        companyLock(user.companyId());
        if(!Set.of("SALE","TRANSFER","RETURN").contains(request.kind()))bad("Loại xuất hàng không hợp lệ");
        var existing=operations.findById(request.id());
        if(existing.isPresent()) {
            var old=owned(existing.get(),warehouse,user.companyId());
            if(!old.getKind().equals(request.kind()) || !fingerprint(request).equals(old.getDetails().get("requestFingerprint")))conflict("Mã yêu cầu đã sử dụng cho nội dung khác");
            return old;
        }
        boolean transfer=request.kind().equals("TRANSFER"),sale=request.kind().equals("SALE");
        if(transfer && (request.targetWarehouseId()==null || warehouse.equals(request.targetWarehouseId())))bad("Chọn kho nhận khác kho xuất");
        if(sale && (blank(request.recipientName())||blank(request.recipientAddress())||blank(request.recipientPhone())))bad("Nhập đủ tên, địa chỉ và số điện thoại người nhận");
        Set<UUID> seen=new HashSet<>(); List<Map<String,Object>> lines=new ArrayList<>();
        for(var input:request.lines().stream().sorted(Comparator.comparing(OutLine::lotId)).toList()) {
            if(!seen.add(input.lotId()))bad("Không chọn trùng lô sản phẩm");
            var lot=lot(warehouse,input.lotId());
            if(lot.getQuantity().subtract(lot.getReserved()).compareTo(input.quantity())<0)conflict("Không đủ tồn kho khả dụng");
            if(!request.kind().equals("RETURN") && (lot.getStatus()!=StockLotStatus.OK || lot.getExpiryDate()!=null&&lot.getExpiryDate().isBefore(LocalDate.now())))conflict("Không thể xuất hàng hỏng hoặc hết hạn");
            BigDecimal base=lot.getUnitPrice();
            if(base==null && !transfer)bad("Lô chưa có giá vốn; cần nhập bằng nghiệp vụ lô hàng mới");
            if(base==null)base=BigDecimal.ZERO;
            BigDecimal percentage=sale?(input.percentage()==null?new BigDecimal("100"):input.percentage()):new BigDecimal("100");
            if(percentage.signum()<0||percentage.compareTo(new BigDecimal("500"))>0)bad("Giá bán phải từ 0% đến 500%");
            BigDecimal price=money(base.multiply(percentage).divide(new BigDecimal("100")));
            var row=new LinkedHashMap<String,Object>();
            row.put("lotId",lot.getId().toString());row.put("productId",lot.getProduct().getId().toString());row.put("sku",lot.getProduct().getSku());row.put("name",lot.getProduct().getName());
            row.put("batchCode",lot.getLotCode());row.put("batchId",lot.getTradeBatchId()==null?null:lot.getTradeBatchId().toString());
            row.put("quantity",input.quantity());row.put("unitPrice",price);row.put("basePrice",base);row.put("percentage",percentage);row.put("total",money(price.multiply(input.quantity())));
            lines.add(row);
        }
        if(request.kind().equals("RETURN"))validateReturn(warehouse,lines,user.companyId());
        var op=new TradeOperation();op.setId(request.id());op.setCompanyId(user.companyId());op.setWarehouseId(warehouse);op.setCreatedBy(user.id());op.setKind(request.kind());
        op.setTargetWarehouseId(transfer?request.targetWarehouseId():null);op.setStatus(transfer?"DONE":request.kind().equals("RETURN")?"PAYMENT_PENDING":"READY");op.setAmount(total(lines));op.setLines(lines);
        var details=new LinkedHashMap<String,Object>();details.put("requestFingerprint",fingerprint(request));details.put("recipientName",request.recipientName());details.put("recipientAddress",request.recipientAddress());details.put("recipientPhone",request.recipientPhone());details.put("note",request.note());op.setDetails(details);
        operations.save(op);
        if(transfer)consume(op,true);else for(var line:lines) {var lot=lot(warehouse,uuid(line,"lotId"));lot.setReserved(lot.getReserved().add(decimal(line.get("quantity"))));}
        return op;
    }

    private void validateReturn(UUID warehouse,List<Map<String,Object>> lines,UUID company) {
        Set<String> ids=new HashSet<>();for(var l:lines){if(l.get("batchId")==null)bad("Chỉ hoàn hàng theo lô nhập");ids.add(l.get("batchId").toString());}
        if(ids.size()!=1)bad("Mỗi yêu cầu hoàn trả phải chọn toàn bộ một lô hàng");
        var batch=batches.lock(UUID.fromString(ids.iterator().next()),company).orElseThrow();
        if(!batch.getStatus().equals("IMPORTED"))conflict("Lô không ở trạng thái có thể hoàn");
        if(total(lines).compareTo(new BigDecimal("10000000"))<0)bad("Chỉ hoàn lô trị giá từ 10.000.000 VNĐ");
        var stock=lots.findByTradeBatchIdAndProduct_WarehouseIdAndDeletedAtIsNull(batch.getId(),warehouse);
        if(stock.size()!=batch.getLines().size() || stock.size()!=lines.size())bad("Phải hoàn đủ toàn bộ lô nhập tại một kho");
        for(var line:lines) {
            var original=batch.getLines().stream().filter(r->r.get("sku").equals(line.get("sku"))).findFirst().orElseThrow();
            var current=lot(warehouse,uuid(line,"lotId"));
            if(decimal(original.get("quantity")).compareTo(decimal(line.get("quantity")))!=0 || current.getQuantity().compareTo(decimal(line.get("quantity")))!=0 || current.getReserved().signum()!=0)
                bad("Chỉ hoàn toàn bộ lô còn nguyên số lượng, chưa xuất hoặc giữ chỗ");
        }
        batch.setStatus("RETURNING");
    }

    public TradeOperation action(UUID warehouse,UUID id,String action,UserIdentity user) {
        companyLock(user.companyId());var op=owned(operations.lock(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy yêu cầu")),warehouse,user.companyId());
        switch(action) {
            case "approve" -> {
                if(!user.role().equals("COMPANY_ADMIN"))forbidden();
                if(!op.getStatus().equals("PENDING_APPROVAL")&&!op.getStatus().equals("PAYMENT_PENDING"))conflict("Yêu cầu không chờ phê duyệt");
                op.setStatus("PAYMENT_PENDING");
            }
            case "reject" -> {
                if(!user.role().equals("COMPANY_ADMIN"))forbidden();
                if(!op.getStatus().equals("PENDING_APPROVAL"))conflict("Chỉ từ chối yêu cầu chưa thanh toán");
                for(String batch:strings(op.getDetails().get("batchIds")))batches.lock(UUID.fromString(batch),op.getCompanyId()).orElseThrow().setStatus("READY");
                op.setStatus("CANCELLED");
            }
            case "ship" -> {if(!op.getKind().equals("SALE")||!op.getStatus().equals("READY"))conflict("Đơn không chờ giao");op.setStatus("SHIPPING");}
            case "complete" -> {
                if(!op.getKind().equals("SALE"))bad("Chỉ hoàn thành vận đơn bán hàng");
                if(op.getStatus().equals("DONE"))return op;
                if(!Set.of("READY","SHIPPING","PAYMENT_PENDING").contains(op.getStatus()))conflict("Trạng thái không hợp lệ");
                op.setStatus("PAYMENT_PENDING");
            }
            case "retry" -> {if(!op.getStatus().equals("PAYMENT_PENDING"))conflict("Không có thanh toán đang chờ");}
            default -> bad("Thao tác không hợp lệ");
        }
        return op;
    }

    /** Called only after the immutable operation has committed. Finance retries use the operation UUID. */
    public TradeOperation settle(UUID id) {
        companyLock(operations.companyId(id).orElseThrow());
        var op=operations.lock(id).orElseThrow();
        if(!op.getStatus().equals("PAYMENT_PENDING"))return op;
        if(!op.getKind().equals("IMPORT"))for(var line:op.getLines()) {
            var lot=lot(op.getWarehouseId(),uuid(line,"lotId"));var quantity=decimal(line.get("quantity"));
            if(lot.getQuantity().compareTo(quantity)<0 || lot.getReserved().compareTo(quantity)<0)conflict("Tồn kho giữ chỗ không còn đủ; chưa thực hiện thanh toán");
        }
        client.settle(op);
        if(op.getKind().equals("IMPORT"))receive(op);else consume(op,false);
        op.setStatus("DONE");
        return op;
    }
    private void receive(TradeOperation op) {
        for(var line:op.getLines()) {
            var product=products.findByWarehouseIdAndSkuIgnoreCaseAndDeletedAtIsNull(op.getWarehouseId(),line.get("sku").toString()).orElseGet(()->
                    products.save(Product.builder().warehouseId(op.getWarehouseId()).sku(line.get("sku").toString()).name(line.get("name").toString()).unit(line.get("unit").toString())
                            .barcode(line.get("barcode").toString()).minStock(decimal(line.get("minStock"))).images(blank(Objects.toString(line.get("image"),""))?List.of():List.of(line.get("image").toString())).build()));
            var lot=lots.save(StockLot.builder().product(product).lotCode(line.get("batchCode").toString()).tradeBatchId(uuid(line,"batchId"))
                    .supplierId(uuid(line,"supplierId")).unitPrice(decimal(line.get("unitPrice"))).quantity(decimal(line.get("quantity"))).build());
            movement(op,lot,lot.getQuantity());
        }
        for(String batch:strings(op.getDetails().get("batchIds")))batches.lock(UUID.fromString(batch),op.getCompanyId()).orElseThrow().setStatus("IMPORTED");
    }
    private void consume(TradeOperation op,boolean transfer) {
        for(var line:op.getLines()) {
            var lot=lot(op.getWarehouseId(),uuid(line,"lotId"));var qty=decimal(line.get("quantity"));
            if(lot.getQuantity().compareTo(qty)<0 || !transfer&&lot.getReserved().compareTo(qty)<0)conflict("Tồn kho đã thay đổi");
            lot.setQuantity(lot.getQuantity().subtract(qty));if(!transfer)lot.setReserved(lot.getReserved().subtract(qty));movement(op,lot,qty.negate());
            if(transfer) {
                var source=lot.getProduct();var product=products.findByWarehouseIdAndSkuIgnoreCaseAndDeletedAtIsNull(op.getTargetWarehouseId(),source.getSku())
                        .orElseGet(()->products.save(Product.builder().warehouseId(op.getTargetWarehouseId()).sku(source.getSku()).name(source.getName()).unit(source.getUnit()).barcode(source.getBarcode()).images(source.getImages()).minStock(source.getMinStock()).build()));
                var destination=lots.findByProduct_IdAndLotCodeIgnoreCaseAndDeletedAtIsNull(product.getId(),lot.getLotCode()).orElseGet(()->StockLot.builder().product(product).lotCode(lot.getLotCode()).tradeBatchId(lot.getTradeBatchId()).supplierId(lot.getSupplierId()).unitPrice(lot.getUnitPrice()).expiryDate(lot.getExpiryDate()).build());
                destination.setQuantity(destination.getQuantity().add(qty));lots.save(destination);movement(op,destination,qty);
            }
        }
        if(op.getKind().equals("RETURN"))batches.lock(uuid(op.getLines().getFirst(),"batchId"),op.getCompanyId()).orElseThrow().setStatus("RETURNED");
    }
    private void movement(TradeOperation op,StockLot lot,BigDecimal qty) { movements.save(StockMovement.builder().warehouseId(lot.getProduct().getWarehouseId()).product(lot.getProduct()).lot(lot).documentType(op.getKind()).documentId(op.getId()).qtyChange(qty).actorId(op.getCreatedBy()).note(Objects.toString(op.getDetails().get("note"),op.getKind())).build()); }
    private StockLot lot(UUID warehouse,UUID id){return lots.findForUpdate(id,warehouse).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy lô sản phẩm trong kho"));}
    private TradeOperation owned(TradeOperation op,UUID warehouse,UUID company){if(!op.getWarehouseId().equals(warehouse)||!op.getCompanyId().equals(company))forbidden();return op;}
    private static List<String> strings(Object value){return value instanceof List<?> list?list.stream().map(Object::toString).toList():List.of();}
    private static UUID uuid(Map<String,Object> row,String key){return UUID.fromString(row.get(key).toString());}
    private static BigDecimal decimal(Object value){return value==null?BigDecimal.ZERO:new BigDecimal(value.toString());}
    private static BigDecimal money(BigDecimal value){return value.setScale(2,RoundingMode.HALF_UP);}
    private static BigDecimal total(List<Map<String,Object>> lines){
        var total=lines.stream().map(l->decimal(l.get("total"))).reduce(BigDecimal.ZERO,BigDecimal::add);
        if(total.signum()<0 || total.compareTo(new BigDecimal("90000000000000"))>0)bad("Tổng tiền vượt phạm vi cho phép");
        return total;
    }
    private static boolean blank(String value){return value==null||value.isBlank();}
    private static String fingerprint(OutRequest request){return UUID.nameUUIDFromBytes(request.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();}
    private static void bad(String message){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
    private static void conflict(String message){throw new ResponseStatusException(HttpStatus.CONFLICT,message);}
    private static void forbidden(){throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Không có quyền thực hiện thao tác");}
}
