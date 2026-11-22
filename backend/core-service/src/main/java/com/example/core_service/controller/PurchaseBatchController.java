package com.example.core_service.controller;

import com.example.core_service.entity.PurchaseBatch;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.*;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.service.CatalogNumbers;
import com.example.core_service.service.PartnerService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.*;
import java.util.*;

@RestController @RequestMapping("/purchase-batches")
@PreAuthorize("hasAnyRole('COMPANY_ADMIN','WAREHOUSE_MANAGER')")
@RequiredArgsConstructor
public class PurchaseBatchController {
    private final PurchaseBatchRepository batches;
    private final SupplierProductRepository products;
    private final PartnerService partners;
    private final CatalogNumbers numbers;
    private final jakarta.persistence.EntityManager entities;
    public record ChatLine(@NotBlank @Size(max=255) String product, @Size(max=255) String supplier,
                           @NotNull @Positive @Digits(integer=10,fraction=2) BigDecimal quantity) {}
    public record ChatOrder(@NotNull UUID requestId, @NotEmpty @Size(max=100) List<@NotNull @Valid ChatLine> lines) {}

    @PostMapping("/from-chat") @Transactional
    public PurchaseBatch fromChat(@Valid @RequestBody ChatOrder request) {
        var companyId = company();
        entities.find(com.example.core_service.entity.Company.class, companyId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        var prior = batches.findByCompanyIdAndCreatedByAndChatRequestId(companyId, SecurityUtils.getCurrentUserId(), request.requestId());
        if (prior.isPresent()) {
            var lines = prior.get().getLines();
            if (lines.size() != request.lines().size() || !java.util.stream.IntStream.range(0, lines.size()).allMatch(i ->
                    (lines.get(i).sku().equalsIgnoreCase(request.lines().get(i).product()) ||
                     lines.get(i).name().equalsIgnoreCase(request.lines().get(i).product())) &&
                    (request.lines().get(i).supplier() == null || lines.get(i).supplierName().equalsIgnoreCase(request.lines().get(i).supplier())) &&
                    lines.get(i).quantity().compareTo(request.lines().get(i).quantity()) == 0))
                throw ApiException.conflict("Mã yêu cầu đã được dùng cho đơn khác.");
            return prior.get();
        }
        var items = new ArrayList<Item>();
        for (var line : request.lines()) {
            var matches = products.chatMatches(companyId, line.product(), line.supplier());
            if (matches.isEmpty()) throw ApiException.badRequest("Không tìm thấy sản phẩm trong danh mục nhà cung cấp: " + line.product());
            if (matches.size() > 1) throw ApiException.badRequest("Có nhiều sản phẩm tên " + line.product() + ". Hãy dùng mã SKU hoặc ghi thêm tên nhà cung cấp.");
            var product = matches.getFirst();
            items.add(new Item(product.getSupplierId(), product.getId(), line.quantity()));
        }
        var batch = create(new Request(items));
        batch.setChatRequestId(request.requestId());
        return batch;
    }
    public record Item(@NotNull UUID supplierId,@NotNull UUID productId,
                       @NotNull @Positive @Digits(integer=10,fraction=2) BigDecimal quantity) {}
    public record Request(@NotEmpty @Size(max=100) List<@NotNull @Valid Item> lines) {}

    private UUID company() {
        UUID id=SecurityUtils.getCurrentCompanyId();
        if(id==null) throw ApiException.forbidden("Tài khoản chưa thuộc công ty.");
        return id;
    }

    @GetMapping public List<PurchaseBatch> list() {
        return batches.findByCompanyIdOrderByCreatedAtDesc(company());
    }

    @GetMapping("/{id}") public PurchaseBatch get(@PathVariable UUID id) {
        var company=company();
        return batches.findById(id).filter(b->company.equals(b.getCompanyId())).orElseThrow(()->ApiException.notFound("Không tìm thấy lô."));
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) @Transactional
    public PurchaseBatch create(@Valid @RequestBody Request request) {
        var company=company();
        var lines=new ArrayList<PurchaseBatch.Line>();
        for(var item: request.lines()) {
            var supplier=partners.get("SUPPLIER",item.supplierId(),false);
            var product=products.findById(item.productId()).filter(p->supplier.getId().equals(p.getSupplierId()))
                    .orElseThrow(()->ApiException.badRequest("Sản phẩm không thuộc nhà cung cấp đã chọn."));
            var amount=product.getPrice().multiply(item.quantity()).setScale(2,RoundingMode.HALF_UP);
            lines.add(new PurchaseBatch.Line(supplier.getId(),supplier.getName(),product.getId(),product.getSku(),
                    product.getName(),product.getUnit(),product.getBarcode(),item.quantity(),product.getPrice(),amount));
        }
        var batch=new PurchaseBatch();
        batch.setCompanyId(company);
        batch.setCode(numbers.batchCode(company));
        batch.setCreatedBy(SecurityUtils.getCurrentUserId());
        batch.setLines(lines);
        batch.setTotal(lines.stream().map(PurchaseBatch.Line::amount).reduce(BigDecimal.ZERO,BigDecimal::add));
        return batches.save(batch);
    }
}
