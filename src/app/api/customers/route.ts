import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// 문자열 유사도 계산을 위한 Sørensen-Dice 계수 및 자카드 지수 알고리즘
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/\s+/g, "");
  const s2 = str2.toLowerCase().replace(/\s+/g, "");
  
  if (s1 === s2) return 1.0;
  
  // 부분 문자열 일치에 높은 유사도 점수 제공 (가중치 0.85)
  if (s1.includes(s2) || s2.includes(s1)) {
    const lenMin = Math.min(s1.length, s2.length);
    const lenMax = Math.max(s1.length, s2.length);
    return (lenMin / lenMax) * 0.85;
  }

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);

  // 글자 수가 적어서 bigram이 안 나오는 경우 (단글자 매칭)
  if (b1.size === 0 || b2.size === 0) {
    const chars1 = new Set(s1.split(""));
    const chars2 = new Set(s2.split(""));
    let intersectCount = 0;
    chars1.forEach(c => {
      if (chars2.has(c)) intersectCount++;
    });
    const unionSize = chars1.size + chars2.size - intersectCount;
    return unionSize > 0 ? (intersectCount / unionSize) * 0.5 : 0;
  }

  let intersection = 0;
  b1.forEach((bg) => {
    if (b2.has(bg)) {
      intersection++;
    }
  });

  return (2.0 * intersection) / (b1.size + b2.size);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    // 1. 농장 정보 확인
    const farm = await prisma.farm.findFirst();
    if (!farm) {
      return NextResponse.json({ customers: [] });
    }

    // 2. 해당 농장의 전체 고객 조회 (활성 고객만)
    const customers = await prisma.customer.findMany({
      where: {
        farmId: farm.id,
        isDeleted: false,
      },
    });

    if (!q.trim()) {
      // 검색어가 없으면 최근 추가된 고객 최대 5명 반환
      const sortedByRecent = [...customers]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);
      return NextResponse.json({ customers: sortedByRecent });
    }

    const query = q.trim();

    // 3. 유사도 계산 및 점수화
    const scoredCustomers = customers.map((c) => {
      const nameScore = calculateSimilarity(c.name, query);
      const nicknameScore = c.nickname ? calculateSimilarity(c.nickname, query) : 0;
      const score = Math.max(nameScore, nicknameScore);
      return { customer: c, score };
    });

    // 4. 유사도 기준 필터링 (최소 0.15 임계값) 및 내림차순 정렬 후 상위 5명 반환
    const matches = scoredCustomers
      .filter((item) => item.score >= 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.customer);

    return NextResponse.json({ customers: matches });
  } catch (error) {
    console.error("[Customers GET API Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, nickname, phone, address, memo } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing customer ID" }, { status: 400 });
    }

    // 1. 농장 정보 확인
    let farm = await prisma.farm.findFirst();
    if (!farm) {
      return NextResponse.json({ error: "농장 정보가 없습니다." }, { status: 404 });
    }

    // 2. 고객 정보 수정
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        nickname: nickname !== undefined ? nickname : undefined,
        phone: phone !== undefined ? phone : undefined,
        address: address !== undefined ? address : undefined,
        memo: memo !== undefined ? memo : undefined,
      },
    });

    // 3. 캐시 재검증
    revalidatePath("/", "layout");

    return NextResponse.json({ success: true, customer: updatedCustomer });
  } catch (error) {
    console.error("[Customers PATCH API Error]", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
