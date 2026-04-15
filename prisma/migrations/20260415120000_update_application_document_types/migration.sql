-- Migration: Update ApplicationDocumentType enum
-- Adds: SCHOOL_STAMP_LETTER, ADMISSION_LETTER, BIRTH_CERTIFICATE_NID, GUARDIAN_ID, DEATH_CERTIFICATE
-- Removes: BALANCE_STATEMENT, SUPPORT_LETTER, OTHER_EVIDENCE
-- Keeps: FEE_STRUCTURE

-- Step 1: Add new enum values
ALTER TYPE "ApplicationDocumentType" ADD VALUE IF NOT EXISTS 'SCHOOL_STAMP_LETTER';
ALTER TYPE "ApplicationDocumentType" ADD VALUE IF NOT EXISTS 'ADMISSION_LETTER';
ALTER TYPE "ApplicationDocumentType" ADD VALUE IF NOT EXISTS 'BIRTH_CERTIFICATE_NID';
ALTER TYPE "ApplicationDocumentType" ADD VALUE IF NOT EXISTS 'GUARDIAN_ID';
ALTER TYPE "ApplicationDocumentType" ADD VALUE IF NOT EXISTS 'DEATH_CERTIFICATE';

-- Step 2: Migrate any existing rows using old enum values to FEE_STRUCTURE (safe fallback)
UPDATE "application_documents"
SET "documentType" = 'FEE_STRUCTURE'
WHERE "documentType" IN ('BALANCE_STATEMENT', 'SUPPORT_LETTER', 'OTHER_EVIDENCE');

-- Step 3: Remove old enum values by recreating the type
-- PostgreSQL does not support DROP VALUE directly, so we rename and recreate
ALTER TYPE "ApplicationDocumentType" RENAME TO "ApplicationDocumentType_old";

CREATE TYPE "ApplicationDocumentType" AS ENUM (
  'SCHOOL_STAMP_LETTER',
  'ADMISSION_LETTER',
  'FEE_STRUCTURE',
  'BIRTH_CERTIFICATE_NID',
  'GUARDIAN_ID',
  'DEATH_CERTIFICATE'
);

-- Step 4: Update the column to use the new type
ALTER TABLE "application_documents"
  ALTER COLUMN "documentType" TYPE "ApplicationDocumentType"
  USING "documentType"::text::"ApplicationDocumentType";

-- Step 5: Drop old type
DROP TYPE "ApplicationDocumentType_old";
