-- CreateTable
CREATE TABLE "MOM" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "notes" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MOM_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MOM_clientId_idx" ON "MOM"("clientId");

-- CreateIndex
CREATE INDEX "MOM_projectId_idx" ON "MOM"("projectId");

-- AddForeignKey
ALTER TABLE "MOM" ADD CONSTRAINT "MOM_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOM" ADD CONSTRAINT "MOM_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOM" ADD CONSTRAINT "MOM_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
