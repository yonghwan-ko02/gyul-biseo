-- AlterTable
ALTER TABLE "farms" ADD COLUMN     "auto_email_courier" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "courier_email" TEXT,
ADD COLUMN     "courier_name" TEXT;
