import { redirect } from "next/navigation";

/** 루트 페이지 → 채팅 화면으로 자동 이동 */
export default function Home() {
  redirect("/chat");
}
