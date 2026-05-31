import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, farmName, ownerName, phone, bankName, accountNumber, accountHolder, courierName, courierEmail, autoEmailCourier } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing farm ID" }, { status: 400 });
    }

    const updatedFarm = await prisma.farm.update({
      where: { id },
      data: {
        farmName,
        ownerName,
        phone,
        bankName,
        accountNumber,
        accountHolder,
        courierName,
        courierEmail,
        autoEmailCourier,
      },
    });

    return NextResponse.json({ success: true, farm: updatedFarm });
  } catch (error) {
    console.error("[Farm API Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
