// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(相場ノート・他計算機と同一)。
const RAKUTEN_AFFILIATE_ID = '567f9cc6.631b3687.567f9cc7.3d3a8a85';

function affiliateUrl(keyword) {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/?s=5`;
  if (!RAKUTEN_AFFILIATE_ID) return searchUrl;
  const encoded = encodeURIComponent(searchUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9`;
}

// この計算機は金額ではなくツール・プランのおすすめを診断するため、ai-chat-tools/ai-coding-toolsと
// 同様に楽天商品検索APIによる動的なおすすめ商品グリッドは使わず、aff-cardの静的リンクのみ表示する。
const affCard = document.getElementById('aff-card');
if (affCard) {
  affCard.href = affiliateUrl('モニターヘッドホン');
}

// 主な用途 × 本気度 のルールベース診断。
// Suno・Udioはクレジット制で1曲あたりの消費クレジットが尺・モデル・編集操作によって変わり、
// 公式も統一的な「1曲あたりのクレジット数」を公表していないため、本数入力からの精密な
// 金額計算はできない前提で設計している(ai-chat-tools/ai-coding-toolsと同じ設計判断)。
const PURPOSE_LABELS = {
  bgm: '動画・配信の背景音楽(BGM)として使いたい',
  vocal: '歌もの(ボーカル入り楽曲)を作りたい',
};
const COMMITMENT_LABELS = {
  trial: 'まずは低コストで試したい',
  serious: '本格的に配信・収益化まで考えている',
};

const RECOMMENDATIONS = {
  bgm: {
    trial: {
      headline: 'Soundraw Creator(¥1,650/月〜)',
      advice: 'BGM(背景音楽)としての利用なら、Creatorプランで無制限にダウンロードできます。継続利用できる無料プランはないため、まずは月払いで試してみるのが現実的です。',
    },
    serious: {
      headline: 'Soundraw Artist Starter(¥2,900/月〜)',
      advice: '作った楽曲をSpotify等へ配信・収益化したい場合、Creatorプランでは対象外のため、Artist Starter以上のプランが必要です。wav・stems形式での書き出しも可能になります。',
    },
  },
  vocal: {
    trial: {
      headline: 'Udioの無料プラン',
      advice: 'Sunoは2026年9月3日から無料プランのダウンロード機能が廃止されたため、無料で歌ものを試すならUdio(1日10クレジット、フル尺2分10秒の楽曲を1日3曲まで生成可)の方が現実的です。ただし無料プランで作った楽曲に商用利用権はありません。',
    },
    serious: {
      headline: 'Suno Pro(¥1,500/月〜)またはUdio Standard($10/月〜)',
      advice: '配信・収益化まで考えるなら有料プランが前提です。商用利用権は「有料プランに加入している間に作った楽曲」のみに付与されるため、無料時代に作った楽曲は対象外になる点に注意してください。',
    },
  },
};

const selectPurpose = document.getElementById('select-purpose');
const selectCommitment = document.getElementById('select-commitment');
const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
let lastHeadline = '';

function computeAndRender() {
  const purpose = selectPurpose.value;
  const commitment = selectCommitment.value;
  const rec = (RECOMMENDATIONS[purpose] && RECOMMENDATIONS[purpose][commitment]) || RECOMMENDATIONS.bgm.trial;

  resultAmount.textContent = rec.headline;
  resultNote.textContent = `${PURPOSE_LABELS[purpose]}・${COMMITMENT_LABELS[commitment]}での目安です。`;
  resultSub.textContent = 'この診断はルールベースの簡易的な目安です。実際に必要なプランは生成頻度・楽曲の長さを見ながら判断してください。';
  resultAdvice.textContent = rec.advice;

  if (affCard) affCard.classList.add('show');
  lastHeadline = rec.headline;
  updateShareUrl();
}

function calc() {
  computeAndRender();
  resultCard.classList.add('show');
  shareRow.classList.add('show');
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

function liveRecalcNow() {
  if (!resultCard.classList.contains('show')) return;
  computeAndRender();
}
selectPurpose.addEventListener('change', liveRecalcNow);
selectCommitment.addEventListener('change', liveRecalcNow);

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('purpose', selectPurpose.value);
  params.set('commitment', selectCommitment.value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(headline) {
  return `音楽生成AIツール(Suno/Udio/Soundraw)の料金比較・簡易診断をやってみました。\nおすすめ:${headline}\n`;
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
  const purpose = params.get('purpose');
  if (!purpose || !PURPOSE_LABELS[purpose]) return;
  selectPurpose.value = purpose;
  const commitment = params.get('commitment');
  if (commitment && COMMITMENT_LABELS[commitment]) selectCommitment.value = commitment;
  calc();
}

initFromQuery();
