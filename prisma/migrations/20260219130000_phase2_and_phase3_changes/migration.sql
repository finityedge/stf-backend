-- =============================================
-- Phase 2 + Phase 3 Migration
-- Adds: new enums, enhanced profile fields,
-- enhanced application fields, institutions,
-- notifications, application periods,
-- review scores, admin note sections,
-- and application-period linkage
-- =============================================

-- ====================
-- NEW ENUMS
-- ====================

-- CreateEnum
CREATE TYPE "HouseholdIncomeRange" AS ENUM ('BELOW_5K', 'FROM_5K_TO_15K', 'FROM_15K_TO_30K', 'ABOVE_30K');

-- CreateEnum
CREATE TYPE "OrphanStatus" AS ENUM ('BOTH_PARENTS_ALIVE', 'SINGLE_ORPHAN', 'DOUBLE_ORPHAN');

-- CreateEnum
CREATE TYPE "WhoLivesWith" AS ENUM ('BOTH_PARENTS', 'SINGLE_MOTHER', 'SINGLE_FATHER', 'GUARDIAN', 'GRANDPARENT', 'ORPHANAGE', 'SELF', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('STATUS_CHANGE', 'DEADLINE_REMINDER', 'APPLICATION_RECEIVED', 'WELCOME', 'GENERAL');

-- ====================
-- PHASE 2: ENHANCED STUDENT PROFILE FIELDS
-- ====================

-- Add institution reference
ALTER TABLE "student_profiles" ADD COLUMN "institutionId" TEXT;

-- Add family & guardian information
ALTER TABLE "student_profiles" ADD COLUMN "whoLivesWithOther" TEXT;
ALTER TABLE "student_profiles" ADD COLUMN "guardianName" TEXT;
ALTER TABLE "student_profiles" ADD COLUMN "guardianPhone" TEXT;
ALTER TABLE "student_profiles" ADD COLUMN "guardianOccupation" TEXT;
ALTER TABLE "student_profiles" ADD COLUMN "householdIncomeRange" "HouseholdIncomeRange";
ALTER TABLE "student_profiles" ADD COLUMN "numberOfDependents" INTEGER;
ALTER TABLE "student_profiles" ADD COLUMN "numberOfSiblings" INTEGER;
ALTER TABLE "student_profiles" ADD COLUMN "siblingsInSchool" INTEGER;

-- Add contact fields
ALTER TABLE "student_profiles" ADD COLUMN "phoneNumber" TEXT;
ALTER TABLE "student_profiles" ADD COLUMN "emergencyContactName" TEXT;
ALTER TABLE "student_profiles" ADD COLUMN "emergencyContactPhone" TEXT;

-- Add vulnerability & background fields
ALTER TABLE "student_profiles" ADD COLUMN "orphanStatus" "OrphanStatus";
ALTER TABLE "student_profiles" ADD COLUMN "disabilityStatus" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "student_profiles" ADD COLUMN "disabilityType" TEXT;
ALTER TABLE "student_profiles" ADD COLUMN "kcseGrade" TEXT;
ALTER TABLE "student_profiles" ADD COLUMN "previousScholarship" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "student_profiles" ADD COLUMN "previousScholarshipDetails" TEXT;

-- Change whoLivesWith from free-text String to WhoLivesWith enum
-- First, drop the old column data and re-create with enum type
-- (existing data will be lost for this column — acceptable since profiles
--  were created during dev/testing only)
ALTER TABLE "student_profiles" DROP COLUMN IF EXISTS "whoLivesWith";
ALTER TABLE "student_profiles" ADD COLUMN "whoLivesWith" "WhoLivesWith";

-- ====================
-- PHASE 2: ENHANCED APPLICATION FIELDS
-- ====================

ALTER TABLE "applications" ADD COLUMN "gpa" TEXT;
ALTER TABLE "applications" ADD COLUMN "expectedGraduationDate" TIMESTAMP(3);
ALTER TABLE "applications" ADD COLUMN "totalAnnualFeeAmount" DECIMAL(12,2);
ALTER TABLE "applications" ADD COLUMN "remainingSemesters" INTEGER;
ALTER TABLE "applications" ADD COLUMN "appliedToOtherScholarships" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "applications" ADD COLUMN "otherScholarshipsDetails" TEXT;
ALTER TABLE "applications" ADD COLUMN "communityInvolvement" TEXT;
ALTER TABLE "applications" ADD COLUMN "careerAspirations" TEXT;
ALTER TABLE "applications" ADD COLUMN "givingBackPlan" TEXT;

-- ====================
-- PHASE 3: ADMIN NOTES — ADD SECTION FIELD
-- ====================

ALTER TABLE "admin_notes" ADD COLUMN "section" TEXT;

-- ====================
-- PHASE 2: INSTITUTIONS TABLE
-- ====================

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EducationLevel" NOT NULL,
    "county" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_name_key" ON "institutions"("name");

-- CreateIndex
CREATE INDEX "institutions_name_idx" ON "institutions"("name");

-- CreateIndex
CREATE INDEX "institutions_type_idx" ON "institutions"("type");

-- AddForeignKey (StudentProfile -> Institution)
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ====================
-- PHASE 3: NOTIFICATIONS TABLE
-- ====================

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ====================
-- PHASE 3: APPLICATION PERIODS TABLE
-- ====================

-- CreateTable
CREATE TABLE "application_periods" (
    "id" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_periods_isActive_idx" ON "application_periods"("isActive");

-- CreateIndex
CREATE INDEX "application_periods_startDate_endDate_idx" ON "application_periods"("startDate", "endDate");

-- ====================
-- PHASE 3: APPLICATION-PERIOD LINKAGE
-- ====================

-- Add applicationPeriodId FK to applications
ALTER TABLE "applications" ADD COLUMN "applicationPeriodId" TEXT;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicationPeriodId_fkey" FOREIGN KEY ("applicationPeriodId") REFERENCES "application_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ====================
-- PHASE 3: REVIEW SCORES TABLE
-- ====================

-- CreateTable
CREATE TABLE "review_scores" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "financialNeed" INTEGER NOT NULL,
    "academicMerit" INTEGER NOT NULL,
    "communityImpact" INTEGER NOT NULL,
    "vulnerability" INTEGER NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (one score per reviewer per application)
CREATE UNIQUE INDEX "review_scores_applicationId_reviewerId_key" ON "review_scores"("applicationId", "reviewerId");

-- CreateIndex
CREATE INDEX "review_scores_applicationId_idx" ON "review_scores"("applicationId");

-- CreateIndex
CREATE INDEX "review_scores_reviewerId_idx" ON "review_scores"("reviewerId");

-- AddForeignKey
ALTER TABLE "review_scores" ADD CONSTRAINT "review_scores_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_scores" ADD CONSTRAINT "review_scores_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
