-- CreateIndex
CREATE INDEX "Email_isRead_aiTier_idx" ON "Email"("isRead", "aiTier");

-- CreateIndex
CREATE INDEX "Task_blockStart_idx" ON "Task"("blockStart");
