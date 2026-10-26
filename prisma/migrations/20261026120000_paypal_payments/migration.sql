-- Additive only: PayPal Orders v2 identifiers for payments.
ALTER TABLE "Payment" ADD COLUMN "paypalOrderId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "paypalCaptureId" TEXT;

CREATE UNIQUE INDEX "Payment_paypalOrderId_key" ON "Payment"("paypalOrderId");
CREATE UNIQUE INDEX "Payment_paypalCaptureId_key" ON "Payment"("paypalCaptureId");
