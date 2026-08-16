// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(相場ノート・他計算機と同一)。
const RAKUTEN_AFFILIATE_ID = '567f9cc6.631b3687.567f9cc7.3d3a8a85';

function affiliateUrl(keyword) {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/?s=5`;
  if (!RAKUTEN_AFFILIATE_ID) return searchUrl;
  const encoded = encodeURIComponent(searchUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9`;
}

// この計算機は金額ではなくプランのおすすめを診断するため、楽天商品検索APIによる
// 動的なおすすめ商品グリッド(product-grid)は使わず、aff-cardの静的リンクのみ表示する。
const affCard = document.getElementById('aff-card');
if (affCard) {
  affCard.href = affiliateUrl('キーボード 疲れにくい');
}

// 主な作業内容 × 使う頻度 のルールベース診断。
// 「確認済みの事実」表にない具体的な利用回数・リクエスト数は書かない方針(Claude Code/Codexは非公開のため)。
const TASK_LABELS = {
  completion: 'コード補完中心',
  agent: '日常的にエージェントに実装を任せる',
  large: '複数ファイルにまたがる大きめの作業を任せる',
};
const FREQ_LABELS = {
  few: '週に数回',
  daily: 'ほぼ毎日',
  allday: '一日中',
};

// highlight: マトリクス表([data-tool][data-tier]セル)のうち、診断結果に対応するセルを光らせるための対応表。
const RECOMMENDATIONS = {
  completion: {
    few: {
      headline: 'まずは無料プランで様子見',
      advice: 'GitHub Copilot Free(コード補完2,000回/月)や、Claude Code・Codexの無料枠でまず試してみてください。本当に上限に達してから有料プランを検討すれば十分です。',
      highlight: [['claude', 'free'], ['codex', 'free'], ['cursor', 'free'], ['copilot', 'free']],
    },
    daily: {
      headline: 'GitHub Copilot Pro($10/月)',
      advice: 'コード補完が無制限になる点が大きく、最も安く始められます。たまにチャットでAIに質問する程度なら、AIクレジット($15分/月)の範囲でも十分なことが多いです。',
      highlight: [['copilot', 'entry']],
    },
    allday: {
      headline: 'GitHub Copilot Pro($10/月)',
      advice: 'まずはコード補完無制限のProで様子を見るのがおすすめです。チャットやエージェント機能の利用が増えて上限に当たるようなら、Pro+やMaxへの切り替えを検討してください。',
      highlight: [['copilot', 'entry']],
    },
  },
  agent: {
    few: {
      headline: 'Claude Code Pro / Codex(ChatGPT Plus)クラス',
      advice: '日常的にエージェントへ実装を任せるスタイルなら、週数回の利用でもこの価格帯から始めるのが目安です。上限に当たる頻度を見ながら、必要ならプラン変更を検討してください。',
      highlight: [['claude', 'entry'], ['codex', 'mid']],
    },
    daily: {
      headline: 'Claude Code Pro / Codex(ChatGPT Plus)クラス',
      advice: '運営者自身の実感としても、副業でサイトやアプリを継続的に作り込むならこの価格帯から始めて十分なことが多いです。',
      highlight: [['claude', 'entry'], ['codex', 'mid']],
    },
    allday: {
      headline: 'Claude Code Max / Cursor Ultra / Copilot Maxクラス',
      advice: '一日中エージェントに実装を任せる使い方は上限に当たりやすくなります。ただし高額なプランなので、まずは下位プランでどのくらいの頻度で上限に当たるかを確認してから切り替えたほうが失敗しにくいです。',
      highlight: [['claude', 'top'], ['cursor', 'top'], ['copilot', 'top']],
    },
  },
  large: {
    few: {
      headline: 'Claude Code Pro / Codex(ChatGPT Plus)クラス',
      advice: '複数ファイルにまたがる作業はエージェント型ツールが向いています。週数回の利用ならこの価格帯から始めて、作業量が増えたら上限に当たる頻度を見て上位プランを検討してください。',
      highlight: [['claude', 'entry'], ['codex', 'mid']],
    },
    daily: {
      headline: 'Claude Code Pro / Codex(ChatGPT Plus)クラス',
      advice: '複数ファイルにまたがる作業をほぼ毎日任せるならこの価格帯が目安です。上限に当たる頻度が高いようなら、Claude Code MaxやCursor Ultraなどの上位プランも選択肢になります。',
      highlight: [['claude', 'entry'], ['codex', 'mid']],
    },
    allday: {
      headline: 'Claude Code Max / Cursor Ultra / Copilot Maxクラス',
      advice: '大きめの作業を一日中任せるスタイルは、本数・作業量が多く上限に当たりやすい典型的なケースです。ただし高額なプランなので、まずは下位プランで上限に当たる頻度を確認してからの方が失敗しにくいです。',
      highlight: [['claude', 'top'], ['cursor', 'top'], ['copilot', 'top']],
    },
  },
};

const matrixBox = document.getElementById('matrix-box');

function clearHighlights() {
  if (!matrixBox) return;
  matrixBox.querySelectorAll('td.highlighted').forEach((td) => td.classList.remove('highlighted'));
}

function applyHighlight(pairs) {
  if (!matrixBox || !pairs) return;
  clearHighlights();
  pairs.forEach(([tool, tier]) => {
    const cell = matrixBox.querySelector(`td[data-tool="${tool}"][data-tier="${tier}"]`);
    if (cell) cell.classList.add('highlighted');
  });
  matrixBox.open = true;
}

const selectTask = document.getElementById('select-task');
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
  const task = selectTask.value;
  const freq = selectFreq.value;
  const rec = (RECOMMENDATIONS[task] && RECOMMENDATIONS[task][freq]) || RECOMMENDATIONS.agent.daily;

  resultAmount.textContent = rec.headline;
  resultNote.textContent = `${TASK_LABELS[task]}・${FREQ_LABELS[freq]}での目安です。`;
  resultSub.textContent = 'この診断はルールベースの簡易的な目安です。実際に必要なプランは、上限に当たる頻度を見ながら判断してください。';
  resultAdvice.textContent = rec.advice;

  resultCard.classList.add('show');
  lastHeadline = rec.headline;
  updateShareUrl();
  shareRow.classList.add('show');
  applyHighlight(rec.highlight);

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('task', selectTask.value);
  params.set('freq', selectFreq.value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(headline) {
  return `AIコーディングツールの料金比較・簡易診断をやってみました。\nおすすめ:${headline}\n`;
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
  const task = params.get('task');
  const freq = params.get('freq');
  if (!task || !TASK_LABELS[task]) return;
  selectTask.value = task;
  if (freq && FREQ_LABELS[freq]) selectFreq.value = freq;
  calc();
}

initFromQuery();
