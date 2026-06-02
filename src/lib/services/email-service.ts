import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

interface EmailOrderData {
  customerName: string;
  phone?: string | null;
  address?: string | null;
  variety: string;
  quantity: number;
  unit: string;
  memo?: string | null;
}

interface FarmData {
  farmName: string | null;
  ownerName: string;
  phone: string | null;
  courierName: string | null;
  courierEmail: string | null;
}

/**
 * 주문 등록 시 제휴된 택배사로 배송지 정보가 담긴 의뢰 이메일을 전송합니다.
 */
export async function sendOrderEmailToCourier(order: EmailOrderData, farm: FarmData): Promise<{ success: boolean; mode: "real" | "mock"; logPath?: string }> {
  const courierEmail = farm.courierEmail;
  if (!courierEmail) {
    console.warn("[Email Service] 택배사 이메일 주소가 설정되어 있지 않아 메일을 발송하지 못했습니다.");
    return { success: false, mode: "mock" };
  }

  const courierName = farm.courierName || "지정 택배사";
  const farmName = farm.farmName || "우리 농장";
  const ownerName = farm.ownerName;
  const farmPhone = farm.phone || "기록 없음";

  const customerName = order.customerName;
  const customerPhone = order.phone || "연락처 미입력";
  const customerAddress = order.address || "배송지 주소 미입력";
  const variety = order.variety;
  const quantity = order.quantity;
  const unit = order.unit || "박스";
  const memoStr = order.memo ? order.memo.replace("단위: ", "") : "배송 시 연락바랍니다.";

  const subject = `[귤비서 배송의뢰] ${farmName}에서 주문 접수된 배송 건을 송부합니다.`;

  // 프리미엄 HTML 메일 양식 작성
  const htmlBody = `
<div style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #ff9d00; border-radius: 12px; background-color: #fffaf0; color: #333;">
  <h2 style="color: #d35400; border-bottom: 2px solid #ff9d00; padding-bottom: 12px; margin-top: 0; font-size: 20px;">🍊 [귤비서 배송의뢰] 주문 접수 및 배송 요청</h2>
  <p style="font-size: 15px; line-height: 1.6;">안녕하세요, <strong>${courierName}</strong> 담당자님.</p>
  <p style="font-size: 15px; line-height: 1.6;"><strong>${farmName}</strong> 농장에서 아래와 같이 직거래 배송을 의뢰하오니, 송장 발급 및 안전한 배송을 부탁드립니다.</p>
  
  <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #ffd494; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
    <h3 style="margin-top: 0; margin-bottom: 10px; color: #e67e22; font-size: 16px; border-left: 3px solid #ff9d00; padding-left: 8px;">🏡 의뢰 농장주 정보</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.6;">
      <tr>
        <td style="padding: 4px 0; width: 100px; color: #666; font-weight: bold;">농 장 명</td>
        <td style="padding: 4px 0;">${farmName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #666; font-weight: bold;">농 장 주</td>
        <td style="padding: 4px 0;">${ownerName} (${farmPhone})</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #ffd494; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
    <h3 style="margin-top: 0; margin-bottom: 10px; color: #e67e22; font-size: 16px; border-left: 3px solid #ff9d00; padding-left: 8px;">📦 고객 배송지 정보</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.8;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; width: 100px; color: #666; font-weight: bold;">수 령 인</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; font-size: 15px; color: #111;">${customerName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-weight: bold;">연 락 처</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #0066cc; font-weight: bold;">${customerPhone}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-weight: bold;">배송지 주소</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">${customerAddress}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-weight: bold;">배송 품목</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #d35400;">${variety} ${quantity}${unit}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666; font-weight: bold;">배송 메모</td>
        <td style="padding: 8px 0; color: #666; font-style: italic;">${memoStr}</td>
      </tr>
    </table>
  </div>
  
  <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; line-height: 1.4;">
    본 메일은 인공지능 농업 비서 서비스 "귤비서"를 통해 배송 즉시 자동으로 생성되어 발송되었습니다.<br />
    (발송처: 귤비서 지능형 스마트 출하 관리 모듈)
  </p>
</div>
`;

  const textBody = `
[귤비서 배송의뢰 - ${farmName}]
안녕하세요, ${courierName} 담당자님.
${farmName} 농장의 주문 배송을 의뢰합니다.

■ 의뢰 농장 정보
- 농장명: ${farmName}
- 농장주: ${ownerName} (${farmPhone})

■ 고객 배송지 정보
- 수령인: ${customerName}
- 연락처: ${customerPhone}
- 주소: ${customerAddress}
- 품목: ${variety} ${quantity}${unit}
- 배송 메모: ${memoStr}

본 의뢰는 "귤비서" 서비스를 통해 자동 발송되었습니다.
`;

  // SMTP 환경 변수 확인
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpPort && smtpUser && smtpPass) {
    try {
      // Nodemailer 발송 시도
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465, // 465 SSL, others TLS
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"${farmName} (귤비서)" <${smtpUser}>`,
        to: courierEmail,
        subject: subject,
        text: textBody,
        html: htmlBody,
      });

      console.info(`[Email Service] ${courierName}(${courierEmail})으로 실주소 메일 발송 완료!`);
      return { success: true, mode: "real" };
    } catch (e) {
      console.error("[Email Service] SMTP 메일 발송 에러, 모의 발송 모드로 백업 수행합니다:", e);
    }
  }

  // ─── 모의 발송 모드 (Mock Mode) ───
  // 이메일 상세 내역을 scratch 폴더 내 텍스트 로그 파일에 저장
  try {
    const isVercel = !!process.env.VERCEL;
    const scratchDir = isVercel ? "/tmp" : path.join(process.cwd(), "scratch");
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const logFile = path.join(scratchDir, "courier-email-logs.txt");
    const logHeader = `\n==================================================\n[발송 일시: ${new Date().toLocaleString()}]\n[수신 택배사: ${courierName} (${courierEmail})]\n[메일 제목: ${subject}]\n==================================================\n`;
    
    fs.appendFileSync(logFile, logHeader + textBody + "\n\nHTML 본문 미리보기:\n" + htmlBody + "\n\n");
    console.info(`[Mock Email Service] ${courierName}(${courierEmail}) 배송의뢰 메일(모의)이 파일에 저장되었습니다: ${logFile}`);
    
    return { 
      success: true, 
      mode: "mock", 
      logPath: logFile 
    };
  } catch (err) {
    console.error("[Email Service] 모의 발송 로그 저장 에러:", err);
    console.info("[Mock Email Service] 파일 저장 실패로 인해 콘솔 로그 출력 후 성공 처리합니다 (Vercel 배포 호환).");
    console.info(`[Mock Email Details]\n수신: ${courierName} (${courierEmail})\n제목: ${subject}\n본문:\n${textBody}`);
    return { 
      success: true, 
      mode: "mock", 
      logPath: "Vercel 서버리스 로그 (Console)" 
    };
  }
}
