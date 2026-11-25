package com.example.finance_service.service;

import com.example.finance_service.entity.Transaction;
import com.example.finance_service.entity.enums.*;
import com.example.finance_service.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class WalletLedger implements ApplicationRunner {
    private final JdbcTemplate db;
    private final TransactionRepository transactions;
    private static final BigDecimal RATE=new BigDecimal("0.05");
    public static final String PLATFORM="PLATFORM";

    public void run(ApplicationArguments args) {
        db.execute("""
            create table if not exists wallets (
              account varchar(100) primary key, balance numeric(24,2) not null default 0 check(balance>=0))
            """);
        db.execute("""
            create table if not exists wallet_events (
              event_key varchar(200) primary key, company_id uuid not null, warehouse_id uuid,
              actor_id uuid not null, operation varchar(40) not null, document_id uuid not null,
              account varchar(100) not null, gross numeric(18,2) not null, fee numeric(18,2) not null,
              transaction_id bigint, created_at timestamp with time zone not null default now())
            """);
    }
    public static String account(UUID company,UUID warehouse) {
        return warehouse==null?"company:"+company:"warehouse:"+warehouse;
    }
    public BigDecimal balance(String account) {
        return db.queryForObject("select coalesce((select balance from wallets where account=?),0)",BigDecimal.class,account);
    }
    private void change(String account,BigDecimal delta) {
        db.update("insert into wallets(account) values(?) on conflict do nothing",account);
        if (db.update("update wallets set balance=balance+? where account=? and balance+?>=0", delta, account, delta) != 1) {
            var missing = delta.negate().subtract(balance(account));
            var error = new ResponseStatusException(HttpStatus.CONFLICT,
                    "Số dư không đủ. Cần bổ sung " + missing.toPlainString() + " VND.");
            error.getBody().setProperty("code", "INSUFFICIENT_FUNDS");
            throw error;
        }
    }
    @Transactional
    public Transaction post(String operation, UUID company,UUID warehouse,UUID actor,UUID ref,
                            boolean companyWallet,BigDecimal amount,TransactionType type,TransactionCategory category,String note) {
        String wallet=account(company,companyWallet?null:warehouse);
        String key=company+":"+operation+":"+ref;
        if(operation.equals("OPENING")) key="OPENING:"+wallet;
        boolean opening=operation.equals("OPENING");
        boolean allocation=operation.equals("ALLOCATION");
        BigDecimal fee=opening?BigDecimal.ZERO:amount.multiply(RATE).setScale(2,RoundingMode.HALF_UP);
        int inserted=db.update("""
            insert into wallet_events(event_key,company_id,warehouse_id,actor_id,operation,document_id,account,gross,fee)
            values(?,?,?,?,?,?,?,?,?) on conflict do nothing
            """,key,company,warehouse,actor,operation,ref,wallet,amount,fee);
        if(inserted==0) {
            var old=db.queryForMap("select * from wallet_events where event_key=?",key);
            // A sale settled before warehouse crediting can still finish its delivery retry.
            boolean walletMatches = wallet.equals(old.get("account"))
                    || ("SALE".equals(operation) && account(company,null).equals(old.get("account")));
            if(!Objects.equals(old.get("warehouse_id"),warehouse)||!walletMatches||
                    !ref.equals(old.get("document_id"))||amount.compareTo((BigDecimal)old.get("gross"))!=0)
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Chứng từ đã ghi với dữ liệu khác.");
            Number id=(Number)old.get("transaction_id");
            return id==null?null:transactions.findById(id.longValue()).orElseThrow();
        }
        if(opening){change(wallet,amount);return null;}
        change(wallet,type==TransactionType.INCOME?amount.subtract(fee):amount.add(fee).negate());
        if(allocation) change(account(company,warehouse),amount);
        if(fee.signum()>0) {
            change(PLATFORM,fee);
            record(company,warehouse,ref,TransactionType.SYSTEM_FEE,TransactionCategory.FEE,fee,"Phí 5% · "+operation);
        }
        if(allocation)return null;
        var tx=record(company,warehouse,ref,type,category,amount,note);
        db.update("update wallet_events set transaction_id=? where event_key=?",tx.getId(),key);
        return tx;
    }
    @Transactional
    public void marketplace(UUID buyer,UUID seller,UUID warehouse,UUID actor,UUID ref,BigDecimal gross) {
        post("MARKETPLACE_BUY",buyer,warehouse,actor,ref,true,gross,TransactionType.EXPENSE,TransactionCategory.PURCHASE,"Mua/thuê kho "+ref);
        if (seller != null) {
            post("MARKETPLACE_SELL", seller, warehouse, actor, ref, true, gross,
                    TransactionType.INCOME, TransactionCategory.SALE, "Bán/cho thuê kho " + ref);
        }
    }
    private Transaction record(UUID company,UUID warehouse,UUID ref,TransactionType type,TransactionCategory category,
                               BigDecimal amount,String note) {
        return transactions.save(Transaction.builder().companyId(company).warehouseId(warehouse).refDocumentId(ref)
                .type(type).category(category).amount(amount).note(note).build());
    }
}
