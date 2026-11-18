-- CreateEnum
CREATE TYPE "WorkerAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "WorkerSkillLevel" AS ENUM ('BASIC', 'INTERMEDIATE', 'EXPERT');

-- CreateTable
CREATE TABLE "worker_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "primaryTrade" TEXT,
    "yearsExperience" INTEGER,
    "languages" TEXT,
    "city" TEXT,
    "country" TEXT,
    "hourlyRate" DECIMAL(18,4),
    "dailyRate" DECIMAL(18,4),
    "currency" TEXT,
    "availability" "WorkerAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "cvUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_experiences" (
    "id" TEXT NOT NULL,
    "workerProfileId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "projectType" TEXT,
    "location" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_education" (
    "id" TEXT NOT NULL,
    "workerProfileId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT,
    "field" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_certifications" (
    "id" TEXT NOT NULL,
    "workerProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "issuedAt" DATE,
    "expiresAt" DATE,
    "credentialId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_skills" (
    "id" TEXT NOT NULL,
    "workerProfileId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "level" "WorkerSkillLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "worker_profiles_userId_key" ON "worker_profiles"("userId");

-- CreateIndex
CREATE INDEX "worker_profiles_city_country_idx" ON "worker_profiles"("city", "country");

-- CreateIndex
CREATE INDEX "worker_profiles_availability_isPublic_idx" ON "worker_profiles"("availability", "isPublic");

-- CreateIndex
CREATE INDEX "worker_profiles_primaryTrade_trgm_idx" ON "worker_profiles" USING GIN ("primaryTrade" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "worker_profiles_city_trgm_idx" ON "worker_profiles" USING GIN ("city" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "worker_experiences_workerProfileId_sortOrder_idx" ON "worker_experiences"("workerProfileId", "sortOrder");

-- CreateIndex
CREATE INDEX "worker_education_workerProfileId_sortOrder_idx" ON "worker_education"("workerProfileId", "sortOrder");

-- CreateIndex
CREATE INDEX "worker_certifications_workerProfileId_sortOrder_idx" ON "worker_certifications"("workerProfileId", "sortOrder");

-- CreateIndex
CREATE INDEX "worker_skills_categoryId_idx" ON "worker_skills"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "worker_skills_workerProfileId_categoryId_key" ON "worker_skills"("workerProfileId", "categoryId");

-- AddForeignKey
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_experiences" ADD CONSTRAINT "worker_experiences_workerProfileId_fkey" FOREIGN KEY ("workerProfileId") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_education" ADD CONSTRAINT "worker_education_workerProfileId_fkey" FOREIGN KEY ("workerProfileId") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_certifications" ADD CONSTRAINT "worker_certifications_workerProfileId_fkey" FOREIGN KEY ("workerProfileId") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_skills" ADD CONSTRAINT "worker_skills_workerProfileId_fkey" FOREIGN KEY ("workerProfileId") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_skills" ADD CONSTRAINT "worker_skills_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
