/**
 * 자연스러운 AI 응답을 생성하기 위한 템플릿 유틸리티입니다.
 * 너무 기계적인 "[출하 완료] ..." 형식 대신, 다양한 문장 패턴을 사용하여
 * 실제 비서와 대화하는 듯한 친근한 느낌을 줍니다.
 */

// 랜덤하게 배열 요소 중 하나를 선택
const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function getShipmentReply(savedName: string, variety: string, quantity: number, unit: string) {
  const nameStr = savedName ? `${savedName}에 ` : "";
  const templates = [
    `네, ${nameStr}${variety} ${quantity}${unit} 보낸 내역 장부에 잘 적어두었습니다! 🍊`,
    `알겠습니다! ${nameStr}${variety} ${quantity}${unit} 출하 기록 꼼꼼히 남겨두었어요.`,
    `확인했습니다. ${nameStr}${variety} ${quantity}${unit} 나간 것 장부에 추가 완료했습니다. 고생하셨어요!`,
    `네네, ${nameStr}${variety} ${quantity}${unit} 출하 건, 잘 기록해두었습니다.`
  ];
  return pickRandom(templates);
}

export function getOrderReply(savedName: string, phone: string | undefined, variety: string, quantity: number, unit: string) {
  const contact = phone || '연락처 없음';
  const templates = [
    `네, ${savedName}(${contact})님의 ${variety} ${quantity}${unit} 주문 접수해 두었습니다. (발송 대기)`,
    `주문 확인했어요! ${savedName}(${contact})님께 보낼 ${variety} ${quantity}${unit} 챙겨주시면 됩니다.`,
    `알겠습니다. ${savedName}님의 ${variety} ${quantity}${unit} 주문, 장부에 발송 대기 상태로 올려두었습니다. 📦`
  ];
  return pickRandom(templates);
}

export function getPaymentReply(customerName: string, amount: number, paymentCount?: number, remainingAmount?: number) {
  const amtStr = amount.toLocaleString();
  
  if (paymentCount !== undefined && paymentCount > 0) {
    let msg = pickRandom([
      `[입금 확인] ${customerName}에서 보내신 ${amtStr}원, 정산 내역에 잘 반영했습니다! 💸 (${paymentCount}건 처리)`,
      `네, ${customerName}에서 ${amtStr}원 입금된 것 확인했습니다. 밀린 장부 ${paymentCount}건에 채워 넣었어요.`,
      `알겠습니다! ${customerName}의 ${amtStr}원 입금 처리 완료했습니다. 수고하셨어요!`
    ]);
    if (remainingAmount && remainingAmount > 0) {
      msg += `\n(※ 잔액 ${remainingAmount.toLocaleString()}원은 아직 매칭되지 않았습니다.)`;
    }
    return msg;
  }
  
  return pickRandom([
    `[입금] ${customerName}에서 ${amtStr}원 입금 확인했습니다.`,
    `네, ${customerName}에서 ${amtStr}원 들어온 것 적어둘게요.`
  ]);
}

export function getFarmLogReply(workType: string, workerCount?: number | null) {
  const workerStr = workerCount ? ` (${workerCount}명)` : "";
  const templates = [
    `오늘 ${workType} 작업${workerStr} 내용 영농일지에 잘 기록했습니다. 오늘 하루도 고생 많으셨어요! 👨‍🌾`,
    `네, ${workType} 작업${workerStr} 일지에 적어두었습니다. 푹 쉬세요!`,
    `알겠습니다. 오늘 ${workType} 하신 내용 영농일지에 추가 완료했어요. ✅`
  ];
  return pickRandom(templates);
}

export function getFallbackReply() {
  const templates = [
    `말씀하신 내용을 장부에 어떻게 기록해야 할지 조금 헷갈려요. 다시 한번 자세히 말씀해 주시겠어요?`,
    `죄송해요, 제가 잘 이해하지 못했어요. 수량이나 거래처를 다시 한번 말씀해 주시면 꼼꼼히 적겠습니다!`,
    `앗, 정보가 조금 부족한 것 같아요. 다시 한번 말씀해 주시겠어요?`
  ];
  return pickRandom(templates);
}
