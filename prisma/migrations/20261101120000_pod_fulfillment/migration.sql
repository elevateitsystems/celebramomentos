-- Additive only: print-on-demand fulfilment (lib/pod). No existing column changes.
-- CreateEnum
CREATE TYPE "PodProvider" AS ENUM ('PRODIGI', 'GELATO', 'PRINTFUL', 'ALERIO_PRINT');

-- CreateEnum
CREATE TYPE "PodFulfillmentStatus" AS ENUM ('NEEDS_ATTENTION', 'READY', 'SUBMITTING', 'SUBMITTED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED');

-- AlterEnum
ALTER TYPE "AssetKind" ADD VALUE 'PRINT_FILE';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "podArtwork" JSONB,
ADD COLUMN     "podFulfillmentId" TEXT,
ADD COLUMN     "podIssues" JSONB,
ADD COLUMN     "podProductRef" TEXT,
ADD COLUMN     "podProvider" "PodProvider";

-- CreateTable
CREATE TABLE "PodFulfillment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PodProvider" NOT NULL,
    "status" "PodFulfillmentStatus" NOT NULL DEFAULT 'READY',
    "mode" TEXT NOT NULL DEFAULT 'draft',
    "reference" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerStatus" TEXT,
    "shippingMethod" TEXT,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastResponse" JSONB,
    "nextAttemptAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PodProvider" NOT NULL,
    "type" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PodFulfillment_reference_key" ON "PodFulfillment"("reference");

-- CreateIndex
CREATE INDEX "PodFulfillment_status_nextAttemptAt_idx" ON "PodFulfillment"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "PodFulfillment_provider_status_idx" ON "PodFulfillment"("provider", "status");

-- CreateIndex
CREATE INDEX "PodFulfillment_providerOrderId_idx" ON "PodFulfillment"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PodFulfillment_orderId_provider_key" ON "PodFulfillment"("orderId", "provider");

-- CreateIndex
CREATE INDEX "OrderItem_podFulfillmentId_idx" ON "OrderItem"("podFulfillmentId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_podFulfillmentId_fkey" FOREIGN KEY ("podFulfillmentId") REFERENCES "PodFulfillment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodFulfillment" ADD CONSTRAINT "PodFulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

