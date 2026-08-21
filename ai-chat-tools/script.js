// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(相場ノート・他計算機と同一)。
const RAKUTEN_AFFILIATE_ID = '567f9cc6.631b3687.567f9cc7.3d3a8a85';

function affiliateUrl(keyword) {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/?s=5`;
  if (!RAKUTEN_AFFILIATE_ID) return searchUrl;
  const encoded = encodeURIComponent(searchUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9`;
}

// この計算機は金額ではなくツール・プランのおすすめを診断するため、ai-coding-toolsと同様に
// 楽天商品検索APIによる動的なおすすめ商品グリッドは使わず、aff-cardの静的リンクのみ表示する。
const affCard = document.getElementById('aff-card');
if (affCard) {
  affCard.href = affiliateUrl('USBマイク');
}

// 主な用途 × 使う頻度 のルールベース診断。
// 3社ともメッセージ数などの絶対的な上限を意図的に非公開にしているため、
// 「◯回まで無料」という精密な個人化計算はできない前提で設計している。
const USAGE_LABELS = {
  casual: 'ちょっとした質問・雑談中心',
  writing: '文章の下書き・要約・壁打ち中心',
  research: '込み入った調査・情報収集(Deep Research系)重視',
  image: '画像生成もよく使う',
  workspace: 'Gmail・ドキュメント等Googleサービスと連携したい',
  coding: 'プログラミング・コーディングもしたい',
};
const FREQ_LABELS = {
  light: 'たまに(週数回)',
  daily: 'ほぼ毎日',
  heavy: '仕事レベルで毎日フル活用',
};

const CODING_REDIRECT = {
  headline: 'AIコーディングツール料金比較ページへ',
  advice: 'コーディング用途はClaude Code・OpenAI Codex・Cursor・GitHub Copilotなど専用ツールの比較が向いています。詳しくは「AIコーディングツール料金比較」ページをご覧ください。',
};

const RECOMMENDATIONS = {
  casual: {
    light: { headline: 'ChatGPTの無料版で十分', advice: '2026年8月からChatGPT無料版のテキストチャットは無制限になったため、雑談や簡単な質問中心なら無料版だけで完結することがほとんどです。' },
    daily: { headline: 'ChatGPTの無料版で十分(まずは様子見)', advice: '毎日使っても、テキストチャット自体は無料版で無制限です。画像生成や音声チャットなど他の機能を頻繁に使うようになったら、Go(¥1,400/月)への切り替えを検討してください。' },
    heavy: { headline: 'ChatGPT Go(¥1,400/月)〜', advice: 'テキストチャット自体は無料でも上限に達しませんが、フル活用する中で画像生成・音声・アップロードの上限に頻繁に当たるようなら、それらの利用枠が増えるGoが候補になります。' },
  },
  writing: {
    light: { headline: 'ChatGPTかClaudeの無料版で十分', advice: 'どちらも無料版で試せます。文章の言い回しや構成の質にこだわりたい場合はClaude、要約・情報整理も併せて使いたい場合はChatGPTが選ばれやすい傾向です。' },
    daily: { headline: 'Claude Pro($20/月・約¥3,180)', advice: '文章作成・壁打ちを毎日使うなら、Claude Proが「無料版の少なくとも5倍」の利用枠を提供します。ChatGPT Plus(約¥3,180/月)も同価格帯の選択肢です。' },
    heavy: { headline: 'Claude Pro、上限に当たるならMaxへ', advice: '仕事レベルで毎日フル活用する場合、Claude Proから始めて、上限に当たる頻度が高いようならMax 5x($100/月・約¥15,900)への切り替えを検討してください。' },
  },
  research: {
    light: { headline: 'ChatGPTの無料版で十分', advice: 'Deep Research機能は無料版でも利用回数は上限付きながら使えます。たまにの利用なら無料版の上限内に収まることが多いです。' },
    daily: { headline: 'ChatGPT PlusまたはGoogle AI Pro(¥2,900/月)', advice: 'Deep Researchをほぼ毎日使うなら、利用回数が拡張されるChatGPT Plus、またはDeep Researchが拡張されるGoogle AI Proが候補になります。' },
    heavy: { headline: 'ChatGPT ProまたはGoogle AI Ultra', advice: '調査を仕事レベルで多用するなら、Deep Researchが最大限利用できるChatGPT Pro(¥16,800/月)や、Google AI Ultra(¥14,500/月〜)が候補になります。高額なプランなので、まずはPlus/Proクラスで上限に当たる頻度を確認してからの方が失敗しにくいです。' },
  },
  image: {
    light: { headline: 'ChatGPTの無料版で十分', advice: '画像生成は無料版でも使えますが、回数と速度に上限があります。たまにの利用なら無料版の範囲で収まることが多いです。' },
    daily: { headline: 'ChatGPT Go(¥1,400/月)', advice: '画像生成をほぼ毎日使うなら、生成回数が増えるGoが候補です。より高精度な画像生成を求めるならPlus(約¥3,180/月)も検討してください。' },
    heavy: { headline: 'ChatGPT Plus〜Pro', advice: '画像生成を仕事レベルで多用するなら、高精度・高速な画像生成が使えるPlus以上、さらに無制限に近い形で使いたいならProが候補です。GeminiのGoogle AIプランも代替候補になります。' },
  },
  workspace: {
    light: { headline: 'Geminiの無料版で十分', advice: 'Gmail・ドキュメント等との連携が主目的でたまにの利用なら、無料のGeminiでまず試すので十分です。' },
    daily: { headline: 'Google AI Plus(¥725/月)', advice: 'Googleサービスとの連携をほぼ毎日使うなら、Gemini利用枠が2倍になり400GBのストレージも付くGoogle AI Plusが候補です。既にGoogle Oneを契約している場合はプラン統合も検討してください。' },
    heavy: { headline: 'Google AI Pro(¥2,900/月)以上', advice: '仕事レベルで多用するなら、利用枠が4倍・ストレージ5TBのGoogle AI Proが候補です。さらに上位のUltraは高額なので、まずProで様子を見てからの方が失敗しにくいです。' },
  },
};

const selectUsage = document.getElementById('select-usage');
const selectFreq = document.getElementById('select-freq');
const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
let lastHeadline = '';

function calc() {
  const usage = selectUsage.value;
  const freq = selectFreq.value;
  const rec = usage === 'coding' ? CODING_REDIRECT : (RECOMMENDATIONS[usage] && RECOMMENDATIONS[usage][freq]) || RECOMMENDATIONS.casual.daily;

  resultAmount.textContent = rec.headline;
  resultNote.textContent = usage === 'coding' ? USAGE_LABELS[usage] : `${USAGE_LABELS[usage]}・${FREQ_LABELS[freq]}での目安です。`;
  resultSub.textContent = 'この診断はルールベースの簡易的な目安です。3社とも具体的な利用回数の上限を非公開にしているため、実際に必要なプランは上限に当たる頻度を見ながら判断してください。';
  resultAdvice.textContent = rec.advice;

  resultCard.classList.add('show');
  if (affCard) affCard.classList.add('show');
  lastHeadline = rec.headline;
  updateShareUrl();
  shareRow.classList.add('show');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('usage', selectUsage.value);
  params.set('freq', selectFreq.value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(headline) {
  return `生成AIチャットツール(ChatGPT/Claude/Gemini)の料金比較・簡易診断をやってみました。\nおすすめ:${headline}\n`;
}

function legacyCopyFallback(text) {
  try {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(input);
    return ok;
  } catch (e) {
    return false;
  }
}

btnCopyLink.addEventListener('click', async () => {
  const original = btnCopyLink.textContent;
  const showCopied = () => {
    btnCopyLink.textContent = 'コピーしました ✓';
    setTimeout(() => { btnCopyLink.textContent = original; }, 2000);
  };
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('clipboard-timeout')), 1500));
    await Promise.race([navigator.clipboard.writeText(location.href), timeout]);
    showCopied();
  } catch (e) {
    if (legacyCopyFallback(location.href)) showCopied();
  }
});
btnShareX.addEventListener('click', () => {
  const text = shareText(lastHeadline);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const usage = params.get('usage');
  if (!usage || !USAGE_LABELS[usage]) return;
  selectUsage.value = usage;
  const freq = params.get('freq');
  if (freq && FREQ_LABELS[freq]) selectFreq.value = freq;
  calc();
}

initFromQuery();
