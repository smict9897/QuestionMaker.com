-- Additive, idempotent deployment: no existing tables or data are altered.
CREATE TABLE IF NOT EXISTS "ModelTestStart" (
  "testId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModelTestStart_pkey" PRIMARY KEY ("testId", "userId")
);
CREATE TABLE IF NOT EXISTS "ApiUsage" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("key")
);
