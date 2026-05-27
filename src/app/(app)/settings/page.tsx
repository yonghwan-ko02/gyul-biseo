import { PrismaClient } from "@prisma/client";
import { SettingsForm } from "@/components/SettingsForm";
import styles from "./settings.module.css";

const prisma = new PrismaClient({});

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let farm = await prisma.farm.findFirst();

  // If no farm exists (should not happen if using app, but just in case)
  if (!farm) {
    farm = await prisma.farm.create({
      data: {
        ownerName: "농장주",
        farmName: "우리 농장"
      }
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>⚙️ 설정</h2>
        <p className="text-secondary">농장 정보 및 손님 주문 링크 관리</p>
      </div>

      <SettingsForm farm={{
        id: farm.id,
        farmName: farm.farmName,
        ownerName: farm.ownerName,
        phone: farm.phone,
        bankName: farm.bankName,
        accountNumber: farm.accountNumber,
        accountHolder: farm.accountHolder
      }} />
    </div>
  );
}
