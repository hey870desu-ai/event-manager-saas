import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// フォント登録
Font.register({
  family: 'IPAExG',
  src: '/fonts/ipaexg.ttf', 
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'IPAExG', fontSize: 10, color: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: 10, marginBottom: 10, width: '100%', textAlign: 'center' },
  flexRow: { flexDirection: 'row', justifyContent: 'space-between' },
  recipientBox: { borderBottom: '1px solid #999', paddingBottom: 5, marginBottom: 20, width: '60%' },
  recipientName: { fontSize: 16, textDecoration: 'underline' },
  senderBox: { width: '40%', textAlign: 'right', fontSize: 9, lineHeight: 1.4 },
  table: { display: "flex", width: "auto", borderStyle: "solid", borderRightWidth: 0, borderBottomWidth: 0, marginTop: 20 },
  tableRow: { margin: "auto", flexDirection: "row" },
  tableColHeader: { width: "25%", borderStyle: "solid", borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#f0f0f0' },
  tableCol: { width: "25%", borderStyle: "solid", borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0 },
  tableCellHeader: { margin: 5, fontSize: 10, fontWeight: 'bold' },
  tableCell: { margin: 5, fontSize: 10 },
  totalArea: { marginTop: 20, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', marginBottom: 5 },
  totalLabel: { width: 100, textAlign: 'right', paddingRight: 10 },
  totalValue: { width: 100, textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #333' },
  grandTotal: { fontSize: 14, fontWeight: 'bold' },
  footer: { marginTop: 40, borderTop: '1px solid #ccc', paddingTop: 10 },
  footerTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 5 },
});

const formatCurrency = (num: number) => `¥${num.toLocaleString()}`;

type Props = {
  tenant: any;
  invoice: any;
  myCompany: any;
};

// ★★★ 1. ページの中身だけの部品（これを使い回します） ★★★
export const InvoicePage = ({ tenant, invoice, myCompany }: Props) => {
  const [year, month] = invoice.month.split('-');
  const startDate = `${year}年${parseInt(month)}月1日`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const endDate = `${parseInt(month)}月${lastDay}日`;
  const defaultPeriod = `${startDate} 〜 ${endDate}`;

  // itemsがない場合のデフォルト作成
  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    {
      name: `システム利用料 (${tenant.plan || 'Standard'}プラン)`,
      detail: `期間: ${defaultPeriod}`,
      price: invoice.amount ? Math.floor(invoice.amount / 1.1) : 0,
      quantity: 1
    }
  ];

  const subTotal = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  const taxAmount = Math.floor(subTotal * 0.1);
  const totalAmount = subTotal + taxAmount;

  const payLimitDate = new Date(parseInt(year), parseInt(month) + 1, 0); 
  const dueDateStr = `${payLimitDate.getFullYear()}年${payLimitDate.getMonth() + 1}月${payLimitDate.getDate()}日`;
  const today = new Date();
  const issueDateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>請 求 書</Text>
      <View style={{ alignItems: 'flex-end', marginBottom: 20 }}>
        <Text>発行日: {issueDateStr}</Text>
        <Text>請求番号: {invoice.id ? invoice.id.substring(0, 10).toUpperCase() : 'NO-ID'}</Text>
        <Text>登録番号: {myCompany.invoiceNumber}</Text>
      </View>

      <View style={styles.flexRow}>
        <View style={styles.recipientBox}>
          <Text style={styles.recipientName}>{tenant.name} 御中</Text>
          <Text style={{ marginTop: 5 }}>ご担当: {tenant.ceoName || "ご担当者"} 様</Text>
        </View>
        <View style={styles.senderBox}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>{myCompany.orgName}</Text>
          <Text>〒{myCompany.zipCode}</Text>
          <Text>{myCompany.address}</Text>
          <Text>TEL: {myCompany.phone}</Text>
          <Text>Email: {myCompany.email}</Text>
        </View>
      </View>

      <View style={{ borderBottom: '2px solid #333', marginBottom: 20, paddingBottom: 5 }}>
        <Text>下記の通りご請求申し上げます。</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
          <Text style={{ fontSize: 12 }}>ご請求金額（税込）</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{formatCurrency(totalAmount)} -</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={{ ...styles.tableColHeader, width: '40%' }}><Text style={styles.tableCellHeader}>品名 / 詳細</Text></View>
          <View style={{ ...styles.tableColHeader, width: '20%' }}><Text style={styles.tableCellHeader}>単価</Text></View>
          <View style={{ ...styles.tableColHeader, width: '20%' }}><Text style={styles.tableCellHeader}>数量</Text></View>
          <View style={{ ...styles.tableColHeader, width: '20%' }}><Text style={styles.tableCellHeader}>金額</Text></View>
        </View>
        {items.map((item: any, index: number) => (
          <View style={styles.tableRow} key={index}>
            <View style={{ ...styles.tableCol, width: '40%' }}>
              <Text style={styles.tableCell}>{item.name}</Text>
              {item.detail && <Text style={{ ...styles.tableCell, fontSize: 8, color: '#666' }}>{item.detail}</Text>}
            </View>
            <View style={{ ...styles.tableCol, width: '20%' }}><Text style={{...styles.tableCell, textAlign:'right'}}>{formatCurrency(item.price)}</Text></View>
            <View style={{ ...styles.tableCol, width: '20%' }}><Text style={{...styles.tableCell, textAlign:'center'}}>{item.quantity}</Text></View>
            <View style={{ ...styles.tableCol, width: '20%' }}><Text style={{...styles.tableCell, textAlign:'right'}}>{formatCurrency(item.price * item.quantity)}</Text></View>
          </View>
        ))}
      </View>

      <View style={styles.totalArea}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>小計:</Text>
          <Text style={styles.totalValue}>{formatCurrency(subTotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>消費税(10%):</Text>
          <Text style={styles.totalValue}>{formatCurrency(taxAmount)}</Text>
        </View>
        <View style={{ ...styles.totalRow, marginTop: 5 }}>
          <Text style={{ ...styles.totalLabel, fontWeight: 'bold' }}>合計:</Text>
          <Text style={{ ...styles.totalValue, ...styles.grandTotal, borderBottom: 'none' }}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>【お振込先】</Text>
        <Text>常陽銀行　郡山支店</Text>
        <Text>普通 1381382</Text>
        <Text>カ）ハナヒロ</Text>
        <Text style={{ ...styles.footerTitle, marginTop: 10 }}>【お支払い期限】</Text>
        <Text>{dueDateStr} までにお振込みをお願い致します。</Text>
      </View>
    </Page>
  );
};

// ★★★ 2. 既存の1枚印刷用（詳細画面で使うやつ） ★★★
// さっき作った InvoicePage を <Document> で包んで返します
export const InvoicePDF = (props: Props) => (
  <Document>
    <InvoicePage {...props} />
  </Document>
);

// ★★★ 3. 【新機能】一括印刷用（管理画面で使うやつ） ★★★
// データリストを受け取って、人数分の InvoicePage を作ります
export const BatchInvoicePDF = ({ dataList, myCompany }: { dataList: any[], myCompany: any }) => (
  <Document>
    {dataList.map((item, index) => (
      <InvoicePage 
        key={index} 
        tenant={item.tenant} 
        invoice={item.invoice} 
        myCompany={myCompany} 
      />
    ))}
  </Document>
);