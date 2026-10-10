-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'PENDING';

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");
