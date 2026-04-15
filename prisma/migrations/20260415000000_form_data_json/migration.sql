-- Migration: form_data_json
-- Replaces all individual application question columns with a single formData JSONB column.
-- Also makes institution fields on student_profiles optional.

-- ==============================
-- 1. APPLICATION TABLE CHANGES
-- ==============================

-- Add new formData JSONB column (consolidates all form questions)
ALTER TABLE "applications" ADD COLUMN "formData" JSONB NOT NULL DEFAULT '{}';

-- Drop old individual question columns (Phase 1 & 2)
ALTER TABLE "applications" DROP COLUMN IF EXISTS "outstandingFeesBalance";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "hardshipNarrative";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "currentYearOfStudy";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "modeOfSponsorship";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "howSupportingEducation";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "currentFeeSituation";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "isFeesAffectingStudies";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "hasBeenSentHome";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "hasMissedExamsOrClasses";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "difficultiesFaced";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "goalForAcademicYear";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "referralSource";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "gpa";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "expectedGraduationDate";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "totalAnnualFeeAmount";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "remainingSemesters";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "appliedToOtherScholarships";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "otherScholarshipsDetails";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "communityInvolvement";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "careerAspirations";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "givingBackPlan";

-- ==============================
-- 2. STUDENT_PROFILES TABLE CHANGES
-- ==============================

-- Make institution fields optional (allow NULL)
ALTER TABLE "student_profiles" ALTER COLUMN "institutionName" DROP NOT NULL;
ALTER TABLE "student_profiles" ALTER COLUMN "institutionType" DROP NOT NULL;
ALTER TABLE "student_profiles" ALTER COLUMN "programmeOrCourse" DROP NOT NULL;
ALTER TABLE "student_profiles" ALTER COLUMN "admissionYear" DROP NOT NULL;
