// 📂 app/admin/guide/payments/layout.tsx
// 📝 役割：「参加費の受け取り方」のタブの題（ページは画面側で動くので、題はここで付ける）。管理画面なので検索には出さない
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "参加費の受け取り方",
  robots: { index: false, follow: false },
};

export default function PaymentsGuideLayout({ children }: { children: ReactNode }) {
  return children;
}
