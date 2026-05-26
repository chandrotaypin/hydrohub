-- CreateEnum
CREATE TYPE "WaterService" AS ENUM ('NEW_CONTAINER', 'REFILL');

-- CreateTable
CREATE TABLE "WaterOrder" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "serviceType" "WaterService" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterOrder_pkey" PRIMARY KEY ("id")
);
