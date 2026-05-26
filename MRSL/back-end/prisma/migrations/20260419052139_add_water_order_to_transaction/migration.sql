/*
  Warnings:

  - A unique constraint covering the columns `[waterOrderId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderType` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('LAUNDRY', 'WATER');

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_orderId_fkey";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "orderType" "OrderType" NOT NULL,
ADD COLUMN     "waterOrderId" INTEGER,
ALTER COLUMN "orderId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_waterOrderId_key" ON "Transaction"("waterOrderId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_waterOrderId_fkey" FOREIGN KEY ("waterOrderId") REFERENCES "WaterOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
