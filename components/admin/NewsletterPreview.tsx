"use client";

// メルマガの見本。送るメールと同じ組み立て（lib/newsletter-email.ts）で HTML を作り、そのまま iframe に出す。
// 写真は lib/newsletter-image.ts で焼き込んだもの（送るときも同じものを Storage に置く）＝見本と届くメールが同じになる
import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { renderNewsletterHtml, type NlBlock, type NlContent, type NlTenant } from '@/lib/newsletter-email';
import { bakeCached, type BakeOptions } from '@/lib/newsletter-image';

export type PreviewImage = { src: string; options: BakeOptions } | null;
export type PreviewDraft = {
  content: Omit<NlContent, 'mainImageUrl' | 'snaps'>;
  main: PreviewImage;
  blocks: (NlBlock & { photo?: PreviewImage })[];
};

type Props = {
  draft: PreviewDraft;
  tenant: NlTenant;
  sampleName: string;
  mode: 'pc' | 'sp';
  getToken: () => Promise<string | undefined>;
};

export default function NewsletterPreview({ draft, tenant, sampleName, mode, getToken }: Props) {
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [height, setHeight] = useState(900);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const draftKey = JSON.stringify(draft);
  const tenantKey = JSON.stringify(tenant);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    const t = setTimeout(async () => {
      let bad = false;
      const bake = (img: PreviewImage) => (img ? bakeCached(img.src, img.options, getToken).promise.then(b => b.url).catch(() => { bad = true; return ''; }) : Promise.resolve(''));
      const [mainUrl, ...urls] = await Promise.all([bake(draft.main), ...draft.blocks.map(b => (b.photo ? bake(b.photo) : Promise.resolve(b.imageUrl || '')))]);
      if (cancelled) return;
      const content: NlContent = {
        ...draft.content,
        mainImageUrl: mainUrl,
        snaps: draft.blocks.map(({ photo, ...b }, i) => ({ ...b, imageUrl: urls[i] })),
      };
      setHtml(renderNewsletterHtml(content, tenant, { recipientName: sampleName, unsubscribeUrl: 'https://www.event-manager.app/unsubscribe', preview: true }));
      setFailed(bad);
      setBusy(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
    // draftKey・tenantKey で中身が変わったときだけ作り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, tenantKey, sampleName]);

  const measure = () => {
    const doc = frameRef.current?.contentDocument;
    if (doc?.documentElement) setHeight(doc.documentElement.scrollHeight + 2);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="h-5 mb-1 text-[10px] font-bold text-slate-500 flex items-center gap-1">
        {busy ? <><Loader2 size={12} className="animate-spin" /> 見本を作っています…</> : failed ? <span className="text-red-500">読み込めない写真がありました（もう一度選び直してください）</span> : <span>届くメールと同じ見え方です（{mode === 'sp' ? 'スマホ' : 'PC'}の幅）</span>}
      </div>
      <iframe
        ref={frameRef}
        title="メールの見本"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        srcDoc={html}
        onLoad={measure}
        className="bg-white shadow-2xl border border-slate-300 rounded-xl max-w-full"
        style={{ width: mode === 'sp' ? 375 : 600, height, border: 0 }}
      />
    </div>
  );
}
