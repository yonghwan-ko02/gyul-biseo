"use client";

interface Props {
  customerName: string;
  amount: number;
  bankInfo: string;
}

export function CopyRequestButton({ customerName, amount, bankInfo }: Props) {
  const handleCopy = () => {
    const text = `${customerName}님, 감귤농장입니다.\n미수금 ${amount.toLocaleString()}원 입금 부탁드립니다.\n\n입금 계좌: ${bankInfo}`;
    navigator.clipboard.writeText(text).then(() => {
      alert("청구 메시지가 복사되었습니다.\n카카오톡 대화창에 '붙여넣기' 하세요!");
    }).catch(() => {
      alert("복사에 실패했습니다.");
    });
  };

  return (
    <button onClick={handleCopy} style={{
      backgroundColor: "var(--color-primary)", 
      color: "white", 
      padding: "10px 16px", 
      borderRadius: "var(--radius-md)", 
      border: "none", 
      fontSize: "var(--font-size-sm)", 
      fontWeight: "600",
      width: "100%",
      marginTop: "12px"
    }}>
      카톡 입금 요청 복사 💬
    </button>
  );
}
