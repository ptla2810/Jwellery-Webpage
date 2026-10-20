-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "sourceCartId" TEXT;

-- CreateIndex
CREATE INDEX "Order_sourceCartId_status_idx" ON "Order"("sourceCartId", "status");
