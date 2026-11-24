package com.example.finance_service;
import com.example.finance_service.service.WalletService;
import com.example.finance_service.service.WalletService.Payment;
import com.example.finance_service.repository.TransactionRepository;
import com.example.finance_service.entity.enums.TransactionType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties={"spring.cloud.config.enabled=false","spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.datasource.url=jdbc:h2:mem:wallet;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Import(WalletService.class) @Transactional(propagation=Propagation.NOT_SUPPORTED)
class WalletPersistenceTests {
    @Autowired WalletService wallet;
    @Autowired TransactionRepository ledger;
    Payment payment(UUID company,UUID warehouse,String kind,String amount){return new Payment(UUID.randomUUID(),company,warehouse,kind,new BigDecimal(amount),"Test");}
    void balance(UUID company,UUID warehouse,String amount){assertEquals(0,new BigDecimal(amount).compareTo((BigDecimal)wallet.balance(company,warehouse).get("balance")));}
    @Test void importSaleReturnAndAllocationReconcileWithJournal() {
        UUID company=UUID.randomUUID(),warehouse=UUID.randomUUID();
        wallet.settle(payment(company,null,"INCOME","1000"));balance(company,null,"950");
        wallet.settle(payment(company,warehouse,"ALLOCATION","200"));balance(company,null,"740");balance(company,warehouse,"200");
        wallet.settle(payment(company,warehouse,"PURCHASE","100"));balance(company,warehouse,"95");
        wallet.settle(payment(company,warehouse,"SALE","50"));balance(company,null,"787.50");balance(company,warehouse,"95");
        wallet.settle(payment(company,null,"RETURN","100"));balance(company,null,"882.50");
        var entries=ledger.findAll().stream().filter(t->t.getCompanyId().equals(company)).toList();
        assertEquals(11,entries.size());
        assertEquals(0,new BigDecimal("72.50").compareTo(entries.stream().filter(t->t.getType()==TransactionType.SYSTEM_FEE).map(t->t.getAmount()).reduce(BigDecimal.ZERO,BigDecimal::add)));
    }
    @Test void insufficientFundsRollBackAndSameRequestCanRetryAfterFunding() {
        UUID company=UUID.randomUUID(),warehouse=UUID.randomUUID();var purchase=payment(company,warehouse,"PURCHASE","100");
        assertThrows(ResponseStatusException.class,()->wallet.settle(purchase));balance(company,warehouse,"0");
        assertFalse(ledger.existsByCompanyIdAndRefDocumentIdAndType(company,purchase.id(),TransactionType.EXPENSE));
        wallet.settle(payment(company,null,"INCOME","1000"));wallet.settle(payment(company,warehouse,"ALLOCATION","105"));
        wallet.settle(purchase);wallet.settle(purchase);balance(company,warehouse,"0");
        assertEquals(2,ledger.findAll().stream().filter(t->purchase.id().equals(t.getRefDocumentId())).count());
        assertThrows(ResponseStatusException.class,()->wallet.settle(new Payment(purchase.id(),company,warehouse,"PURCHASE",new BigDecimal("200"),"Changed")));
    }
    @Test void concurrentRetriesOnlyChargeOnce() throws Exception {
        UUID company=UUID.randomUUID();wallet.settle(payment(company,null,"INCOME","1000"));var purchase=payment(company,null,"PURCHASE","100");
        try(var executor=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            var a=executor.submit(()->{start.await();wallet.settle(purchase);return true;});
            var b=executor.submit(()->{start.await();wallet.settle(purchase);return true;});start.countDown();
            assertTrue(a.get(10,TimeUnit.SECONDS));assertTrue(b.get(10,TimeUnit.SECONDS));
        }
        balance(company,null,"845");
    }
}
