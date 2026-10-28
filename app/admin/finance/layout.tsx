// 📂 app/admin/finance/layout.tsx
// 📝 役割：「収支」のタブの題（ページは画面側で動くので、題はここで付ける）。管理画面なので検索には出さない
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "収支",
  robots: { index: false, follow: false },
};

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return children;
}
