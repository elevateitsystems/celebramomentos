-- Shipment tracking for print orders (additive, nullable: existing rows and older code are unaffected).
ALTER TABLE "PodFulfillment" ADD COLUMN "tracking" JSONB;
