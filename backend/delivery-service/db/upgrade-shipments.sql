-- Run against wareflow_delivery BEFORE starting the updated service on an existing database.
-- On a new database Hibernate creates the schema; this script is unnecessary.
-- Never discard duplicate records automatically. Resolve them before retrying.
BEGIN;
LOCK TABLE shipments IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM shipments GROUP BY document_id HAVING count(*) > 1)
       OR EXISTS (SELECT 1 FROM shipments GROUP BY warehouse_id, carrier, tracking_code HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Duplicate shipments exist. Resolve duplicates before upgrading.';
    END IF;
    IF EXISTS (SELECT 1 FROM shipments WHERE cod_amount < 0) THEN
        RAISE EXCEPTION 'Negative COD exists. Correct amounts before upgrading.';
    END IF;
END $$;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS cod_status varchar(255);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS collected_at timestamp with time zone;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS collected_by uuid;
UPDATE shipments SET cod_amount = 0 WHERE cod_amount IS NULL;
UPDATE shipments SET cod_status = CASE WHEN cod_amount = 0 THEN 'NOT_REQUIRED' ELSE 'PENDING' END
WHERE cod_status IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_shipment_document ON shipments(document_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_shipment_tracking ON shipments(warehouse_id, carrier, tracking_code);
COMMIT;
