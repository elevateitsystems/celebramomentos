-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN "replies" JSONB;

-- CreateTable
CREATE TABLE "CartLine" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "templateSlug" TEXT,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CartLine_customerId_idx" ON "CartLine"("customerId");

-- AddForeignKey
ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
