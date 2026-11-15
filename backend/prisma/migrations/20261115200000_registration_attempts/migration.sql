-- CreateTable
CREATE TABLE "registration_attempts" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registration_attempts_deviceId_createdAt_idx" ON "registration_attempts"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "registration_attempts_ipAddress_idx" ON "registration_attempts"("ipAddress");
