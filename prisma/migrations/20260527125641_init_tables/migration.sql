-- CreateTable
CREATE TABLE "farms" (
    "id" TEXT NOT NULL,
    "farm_name" TEXT,
    "owner_name" TEXT NOT NULL,
    "phone" TEXT,
    "bank_name" TEXT,
    "account_number" TEXT,
    "account_holder" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "type" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "memo" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "shipment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variety" TEXT NOT NULL,
    "grade" TEXT,
    "package_weight" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER,
    "total_amount" INTEGER,
    "outstanding_amount" INTEGER,
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "shipping_included" BOOLEAN NOT NULL DEFAULT false,
    "raw_input" TEXT,
    "memo" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "memo" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_logs" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "target_field" TEXT,
    "description" TEXT NOT NULL,
    "raw_input" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "daily_wage" INTEGER,
    "memo" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_records" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "work_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hours" DOUBLE PRECISION,
    "daily_wage" INTEGER NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "memo" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_farm_id_idx" ON "customers"("farm_id");

-- CreateIndex
CREATE INDEX "customers_nickname_idx" ON "customers"("nickname");

-- CreateIndex
CREATE INDEX "shipments_farm_id_idx" ON "shipments"("farm_id");

-- CreateIndex
CREATE INDEX "shipments_customer_id_idx" ON "shipments"("customer_id");

-- CreateIndex
CREATE INDEX "shipments_payment_status_idx" ON "shipments"("payment_status");

-- CreateIndex
CREATE INDEX "shipments_shipment_date_idx" ON "shipments"("shipment_date");

-- CreateIndex
CREATE INDEX "payments_shipment_id_idx" ON "payments"("shipment_id");

-- CreateIndex
CREATE INDEX "farm_logs_farm_id_idx" ON "farm_logs"("farm_id");

-- CreateIndex
CREATE INDEX "farm_logs_log_date_idx" ON "farm_logs"("log_date");

-- CreateIndex
CREATE INDEX "workers_farm_id_idx" ON "workers"("farm_id");

-- CreateIndex
CREATE INDEX "work_records_worker_id_idx" ON "work_records"("worker_id");

-- CreateIndex
CREATE INDEX "work_records_farm_id_idx" ON "work_records"("farm_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_logs" ADD CONSTRAINT "farm_logs_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
