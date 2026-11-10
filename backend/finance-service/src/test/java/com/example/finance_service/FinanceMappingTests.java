package com.example.finance_service;

import com.example.finance_service.entity.Budget;
import com.example.finance_service.entity.Transaction;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import org.hibernate.annotations.CreationTimestamp;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Persistence contracts for the finance entities; no external database is needed. */
class FinanceMappingTests {
    @ParameterizedTest
    @ValueSource(classes = {Budget.class, Transaction.class})
    void moneyUsesRequiredDecimalWithTwoFractionalDigits(Class<?> entity) throws Exception {
        String fieldName = entity == Budget.class ? "allocated" : "amount";
        Field field = entity.getDeclaredField(fieldName);
        assertEquals(BigDecimal.class, field.getType(), "Money must not use floating point");
        Column column = field.getAnnotation(Column.class);
        assertNotNull(column);
        assertAll(
                () -> assertEquals(18, column.precision()),
                () -> assertEquals(2, column.scale()),
                () -> assertFalse(column.nullable()));
    }

    @ParameterizedTest
    @ValueSource(classes = {Budget.class, Transaction.class})
    void companyIsRequiredAndWarehouseIsOptionalForCompanyLevelFinance(Class<?> entity) throws Exception {
        Field company = entity.getDeclaredField("companyId");
        Field warehouse = entity.getDeclaredField("warehouseId");
        assertAll(
                () -> assertEquals(UUID.class, company.getType()),
                () -> assertEquals("company_id", company.getAnnotation(Column.class).name()),
                () -> assertFalse(company.getAnnotation(Column.class).nullable()),
                () -> assertEquals(UUID.class, warehouse.getType()),
                () -> assertEquals("warehouse_id", warehouse.getAnnotation(Column.class).name()),
                () -> assertTrue(warehouse.getAnnotation(Column.class).nullable()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"type", "category"})
    void transactionEnumsAreRequiredAndStoredByName(String name) throws Exception {
        Field field = Transaction.class.getDeclaredField(name);
        assertAll(
                () -> assertTrue(field.getType().isEnum()),
                () -> assertEquals(EnumType.STRING, field.getAnnotation(Enumerated.class).value()),
                () -> assertFalse(field.getAnnotation(Column.class).nullable()));
    }

    @Test void transactionCanReferenceAnExportOrTransferDocument() throws Exception {
        Field reference = Transaction.class.getDeclaredField("refDocumentId");
        assertAll(
                () -> assertEquals(UUID.class, reference.getType()),
                () -> assertEquals("ref_document_id", reference.getAnnotation(Column.class).name()),
                () -> assertTrue(reference.getAnnotation(Column.class).nullable()));
    }

    @ParameterizedTest
    @ValueSource(classes = {Budget.class, Transaction.class})
    void creationTimestampIsGeneratedAndCannotBeUpdated(Class<?> entity) throws Exception {
        Field createdAt = entity.getDeclaredField("createdAt");
        assertNotNull(createdAt.getAnnotation(CreationTimestamp.class));
        assertFalse(createdAt.getAnnotation(Column.class).updatable());
    }

    @ParameterizedTest
    @CsvSource({"Budget, UUID", "Transaction, IDENTITY"})
    void identifiersUseTheExpectedDatabaseGeneration(String entityName, GenerationType strategy) throws Exception {
        Class<?> entity = entityName.equals("Budget") ? Budget.class : Transaction.class;
        assertEquals(strategy, entity.getDeclaredField("id").getAnnotation(GeneratedValue.class).strategy());
    }

    @Test void budgetRequiresAnAccountingPeriod() throws Exception {
        assertFalse(Budget.class.getDeclaredField("period").getAnnotation(Column.class).nullable());
    }
}
