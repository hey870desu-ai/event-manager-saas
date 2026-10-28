// 📂 components/ReceiptPDF.tsx
// 📝 役割：参加者への領収証の PDF（A5 横）。サーバー（app/api/receipts）で作る。決まりは lib/receipt.ts
//   字は IPAex ゴシック（public/fonts/ipaexg.ttf）。薄い字は使わない
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

const INK = "#111827";
const s = StyleSheet.create({
  page: { fontFamily: "IPAExG", color: INK, paddingTop: 34, paddingBottom: 30, paddingHorizontal: 44, fontSize: 10.5 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 24, letterSpacing: 12, textAlign: "center", flexGrow: 1, marginLeft: 120 },
  meta: { width: 150, fontSize: 9.5, lineHeight: 1.6, textAlign: "right" },
  nameRow: { marginTop: 18, flexDirection: "row", alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 4, width: 300 },
  name: { fontSize: 15 },
  sama: { fontSize: 12, marginLeft: 8 },
  amountBox: { marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.2, borderColor: INK, paddingVertical: 10 },
  amountLabel: { fontSize: 11, marginRight: 18 },
  amount: { fontSize: 22, letterSpacing: 1 },
  taxIncl: { fontSize: 10, marginLeft: 10 },
  body: { marginTop: 14, lineHeight: 1.75 },
  bottom: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  tax: { fontSize: 9.5, lineHeight: 1.6 },
  issuer: { width: 230, fontSize: 9.5, lineHeight: 1.6 },
  issuerName: { fontSize: 11.5, marginBottom: 2 },
  void: { marginTop: 6, fontSize: 9 },
});

export function ReceiptDocument({ r }: { r: ReceiptData }) {
  const tax = taxIn10(r.amount);
  return (
    <Document title={`領収証 ${r.no}`} author={r.issuer.name} creator="イベントシステム絆太郎">
      <Page size="A5" orientation="landscape" style={s.page}>
        <View style={s.head}>
          <Text style={s.title}>領収証</Text>
          <View style={s.meta}>
            <Text>No. {r.no}</Text>
            <Text>発行日 {jpDate(r.issueDate)}</Text>
          </View>
        </View>

        <View style={s.nameRow}>
          <Text style={s.name}>{r.name}</Text>
          <Text style={s.sama}>様</Text>
        </View>

        <View style={s.amountBox}>
          <Text style={s.amountLabel}>金額</Text>
          <Text style={s.amount}>{yenText(r.amount)}</Text>
          <Text style={s.taxIncl}>（税込）</Text>
        </View>

        <View style={s.body}>
          <Text>但し {r.note}</Text>
          <Text>上記の金額を正に領収いたしました。</Text>
          <Text>お支払い方法：{r.method}</Text>
          {r.previousNo ? <Text style={s.void}>この領収証は No. {r.previousNo} を作り直したものです（No. {r.previousNo} は無効です）。</Text> : null}
        </View>

        <View style={s.bottom}>
          <View style={s.tax}>
            {r.issuer.regNo ? <Text>内訳　10%対象 {r.amount.toLocaleString("ja-JP")}円（うち消費税 {tax.toLocaleString("ja-JP")}円）</Text> : null}
          </View>
          <View style={s.issuer}>
            <Text style={s.issuerName}>{r.issuer.name}</Text>
            {r.issuer.address ? <Text>{r.issuer.address}</Text> : null}
            {r.issuer.phone ? <Text>電話 {r.issuer.phone}</Text> : null}
            {r.issuer.regNo ? <Text>登録番号 {r.issuer.regNo}</Text> : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
