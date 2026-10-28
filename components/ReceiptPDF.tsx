// 📂 components/ReceiptPDF.tsx
// 📝 役割：参加者への領収証の PDF（A5 横）。サーバー（app/api/receipts）で作る。決まりは lib/receipt.ts
//   字は IPAex ゴシック（public/fonts/ipaexg.ttf）。字は濃い色だけ（薄い字は使わない）。線と帯で整える
//   2026-10-29 塙さん「領収証のレイアウトがしょぼいね」→ 二重の枠・題の下線・金額の帯・番号と発行日の小さな表・
//   開催日／チケット／お支払い方法／内訳の表・主催者の欄、に作り直した
import React from "react";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { jpDate, taxIn10, yenText, type ReceiptData } from "@/lib/receipt";

let fontReady = false;
export function registerReceiptFont(src: string) {
  if (fontReady) return;
  Font.register({ family: "IPAExG", src });
  // 日本語は語の切れ目が無いので、1字ずつ折り返せるようにする
  Font.registerHyphenationCallback(word => Array.from(word).flatMap(ch => [ch, ""]).slice(0, -1));
  fontReady = true;
}

const INK = "#111827";   // 字
const NAVY = "#1E3A5F";  // 枠・線・見出し
const BAND = "#EDF1F7";  // 金額の帯・表の見出しの地（字は濃いまま）
const LINE = "#7C8796";  // 細い罫線

const s = StyleSheet.create({
  page: { fontFamily: "IPAExG", color: INK, padding: 16, fontSize: 10 },
  outer: { flexGrow: 1, borderWidth: 2, borderColor: NAVY, padding: 3 },
  inner: { flexGrow: 1, borderWidth: 0.6, borderColor: NAVY, paddingTop: 16, paddingBottom: 14, paddingHorizontal: 24 },

  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  titleBox: { width: 190 },
  title: { fontSize: 29, letterSpacing: 15, color: NAVY },
  titleRule: { marginTop: 6, height: 2, backgroundColor: NAVY, width: 168 },
  titleSub: { marginTop: 3, fontSize: 7.5, letterSpacing: 3, color: NAVY },
  meta: { width: 186, borderTopWidth: 0.6, borderLeftWidth: 0.6, borderColor: LINE },
  metaRow: { flexDirection: "row" },
  metaLabel: { width: 52, backgroundColor: BAND, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: LINE, paddingVertical: 4, paddingHorizontal: 6, fontSize: 8.5 },
  metaValue: { flexGrow: 1, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: LINE, paddingVertical: 4, paddingHorizontal: 6, fontSize: 9 },

  nameRow: { marginTop: 22, flexDirection: "row", alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 4, width: 330 },
  name: { flexGrow: 1, flexShrink: 1 },
  sama: { fontSize: 13, marginLeft: 10 },

  band: { marginTop: 22, flexDirection: "row", alignItems: "center", backgroundColor: BAND, borderLeftWidth: 5, borderLeftColor: NAVY, paddingVertical: 13, paddingLeft: 16, paddingRight: 18 },
  bandLabel: { fontSize: 11, color: NAVY, width: 54, letterSpacing: 4 },
  amount: { fontSize: 31, letterSpacing: 1 },
  taxIncl: { fontSize: 10, marginLeft: 10, marginTop: 8 },

  noteRow: { marginTop: 20, flexDirection: "row", alignItems: "flex-end" },
  noteLabel: { width: 34, fontSize: 11 },
  note: { flexGrow: 1, flexShrink: 1, fontSize: 11, borderBottomWidth: 0.6, borderBottomColor: LINE, paddingBottom: 3 },
  received: { marginTop: 9, fontSize: 10.5 },

  bottom: { marginTop: "auto", paddingTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  detail: { width: 270, borderTopWidth: 0.6, borderLeftWidth: 0.6, borderColor: LINE },
  detailRow: { flexDirection: "row" },
  detailLabel: { width: 74, backgroundColor: BAND, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: LINE, paddingVertical: 3.5, paddingHorizontal: 6, fontSize: 8.5 },
  detailValue: { flexGrow: 1, flexShrink: 1, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: LINE, paddingVertical: 3.5, paddingHorizontal: 6, fontSize: 8.8 },
  remade: { marginTop: 4, fontSize: 8.5 },

  issuer: { width: 214 },
  issuerName: { fontSize: 13.5 },
  issuerRule: { marginTop: 4, marginBottom: 4, height: 0.8, backgroundColor: NAVY },
  issuerLine: { fontSize: 8.8, lineHeight: 1.55 },
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow} wrap={false}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

export function ReceiptDocument({ r }: { r: ReceiptData }) {
  const tax = taxIn10(r.amount);
  // 宛名が長いときは字を小さくして、1行に収める
  const nameLen = Array.from(r.name).length;
  const nameSize = nameLen <= 14 ? 19 : nameLen <= 18 ? 16 : nameLen <= 24 ? 13 : nameLen <= 30 ? 11 : 9.5;
  const rows: [string, string][] = [];
  if (r.eventDate) rows.push(["開催日", jpDate(r.eventDate)]);
  if (r.ticket) rows.push(["チケット", r.ticket]);
  rows.push(["お支払い方法", r.method]);
  if (r.issuer.regNo) rows.push(["内訳", `10%対象 ${r.amount.toLocaleString("ja-JP")}円（うち消費税 ${tax.toLocaleString("ja-JP")}円）`]);
  return (
    <Document title={`領収証 ${r.no}`} author={r.issuer.name} creator="イベントシステム絆太郎">
      <Page size="A5" orientation="landscape" style={s.page}>
        <View style={s.outer}>
          <View style={s.inner}>
            <View style={s.head}>
              <View style={s.titleBox}>
                <Text style={s.title}>領収証</Text>
                <View style={s.titleRule} />
                <Text style={s.titleSub}>RECEIPT</Text>
              </View>
              <View style={s.meta}>
                <View style={s.metaRow}><Text style={s.metaLabel}>No.</Text><Text style={s.metaValue}>{r.no}</Text></View>
                <View style={s.metaRow}><Text style={s.metaLabel}>発行日</Text><Text style={s.metaValue}>{jpDate(r.issueDate)}</Text></View>
              </View>
            </View>

            <View style={s.nameRow}>
              <Text style={[s.name, { fontSize: nameSize }]}>{r.name}</Text>
              <Text style={s.sama}>様</Text>
            </View>

            <View style={s.band}>
              <Text style={s.bandLabel}>金額</Text>
              <Text style={s.amount}>{yenText(r.amount)}</Text>
              <Text style={s.taxIncl}>（税込）</Text>
            </View>

            <View style={s.noteRow}>
              <Text style={s.noteLabel}>但し</Text>
              <Text style={s.note}>{r.note}</Text>
            </View>
            <Text style={s.received}>上記の金額を正に領収いたしました。</Text>
            {r.previousNo ? <Text style={s.remade}>この領収証は No. {r.previousNo} を作り直したものです（No. {r.previousNo} は無効です）。</Text> : null}

            <View style={s.bottom}>
              <View style={s.detail}>
                {rows.map(([label, value]) => <Row key={label} label={label} value={value} />)}
              </View>
              <View style={s.issuer}>
                <Text style={s.issuerName}>{r.issuer.name}</Text>
                <View style={s.issuerRule} />
                {r.issuer.address ? <Text style={s.issuerLine}>{r.issuer.address}</Text> : null}
                {r.issuer.phone ? <Text style={s.issuerLine}>電話 {r.issuer.phone}</Text> : null}
                {r.issuer.regNo ? <Text style={s.issuerLine}>登録番号 {r.issuer.regNo}</Text> : null}
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
