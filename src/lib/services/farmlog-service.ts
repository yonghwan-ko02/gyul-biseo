import { prisma } from "@/lib/prisma";

interface CreateFarmLogDTO {
  workType: string;
  workerCount?: number | null;
  details: string;
  rawInput?: string;
}

/**
 * 영농일지를 FarmLog 테이블에 저장합니다.
 */
export async function createFarmLogRecord(data: CreateFarmLogDTO) {
  let farm = await prisma.farm.findFirst();
  if (!farm) throw new Error("농장 정보가 없습니다.");

  // workType을 DB의 category 필드에 매핑
  const categoryMap: Record<string, string> = {
    "방제": "spray",
    "농약": "spray",
    "비료": "spray",
    "전정": "prune",
    "가지치기": "prune",
    "수확": "harvest",
    "적과": "other",
  };

  const category = categoryMap[data.workType] || "other";

  const farmLog = await prisma.farmLog.create({
    data: {
      farmId: farm.id,
      category,
      description: data.workerCount
        ? `${data.workType} 작업 (${data.workerCount}명) - ${data.details}`
        : `${data.workType} 작업 - ${data.details}`,
      rawInput: data.rawInput,
    },
  });

  return farmLog;
}
