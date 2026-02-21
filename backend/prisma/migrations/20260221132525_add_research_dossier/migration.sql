-- CreateTable
CREATE TABLE "ResearchDossier" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "rawResponse" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchDossier_pkey" PRIMARY KEY ("id")
);
