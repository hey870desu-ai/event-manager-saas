// アンケート回答（answers）と申込欄の回答（customAnswers）の読み方。管理の画面とイベントのまとめで同じものを使う
//
// answers は新旧3種類の形がある
//  新 : 連番キーのマップ {"0":{label,value}, "1":{...}}（マップ型でルール通過＋長文ラベルは値側）
//  中 : 配列 [{label, value}]（2026-06-12〜の形式）
//  旧 : ラベルキーのマップ {label: value}
const isLabelValueObj = (v: any): boolean =>
  !!v && typeof v === "object" && !Array.isArray(v) && "label" in v;

export const answerEntries = (answers: any): Array<[string, any]> => {
  if (Array.isArray(answers)) return answers.map((a: any) => [a?.label ?? "", a?.value]);
  if (answers && typeof answers === "object") {
    const vals = Object.values(answers);
    if (vals.length > 0 && vals.every(isLabelValueObj)) {
      return vals.map((v: any) => [v.label ?? "", v.value]);
    }
    return Object.entries(answers);
  }
  return [];
};

export const answerValue = (answers: any, label: string): any => {
  if (Array.isArray(answers)) return answers.find((a: any) => a?.label === label)?.value;
  if (answers && typeof answers === "object") {
    const vals = Object.values(answers);
    if (vals.length > 0 && vals.every(isLabelValueObj)) {
      return (vals.find((v: any) => v.label === label) as any)?.value;
    }
    return answers?.[label];
  }
  return undefined;
};

// 申込欄の回答（customAnswers）：新は配列 [{label, value}]・旧は {label: value}
//   申込フォームは質問の文を200文字で切って保存する（ReservationForm.tsx）。長い同意の文などは切った文でも探す
export const customAnswerValue = (customAnswers: any, label: string): any => {
  const cut = String(label || "").slice(0, 200);
  if (Array.isArray(customAnswers)) {
    return customAnswers.find((a: any) => a?.label === label || a?.label === cut)?.value;
  }
  if (customAnswers && typeof customAnswers === "object") return customAnswers[label] ?? customAnswers[cut];
  return undefined;
};

// 選ぶ質問（プルダウン・チェックボックス）の選択肢。保存は options（配列）か optionsString（カンマ区切り）
export const fieldOptions = (field: any): string[] => {
  if (Array.isArray(field?.options) && field.options.length > 0) return field.options.map((o: any) => String(o));
  return String(field?.optionsString || "")
    .split(/[,、\n]/)
    .map(s => s.trim())
    .filter(Boolean);
};

// 1つの回答を、表に出す文字にする（複数選択は「／」でつなぐ）
export const answerText = (v: any): string => {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(x => String(x)).join("／");
  if (typeof v === "boolean") return v ? "はい" : "";
  return String(v);
};
