import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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
