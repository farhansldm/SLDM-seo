DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "UserCredential";

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supabaseAuthId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseAuthId_key" ON "User"("supabaseAuthId");
