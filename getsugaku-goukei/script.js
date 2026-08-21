// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(相場ノート・他計算機と同一)。
const RAKUTEN_AFFILIATE_ID = '567f9cc6.631b3687.567f9cc7.3d3a8a85';

function affiliateUrl(keyword) {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/?s=5`;
  if (!RAKUTEN_AFFILIATE_ID) return searchUrl;
  const encoded = encodeURIComponent(searchUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9`;
}

const affCard = document.getElementById('aff-card');
if (affCard) {
  affCard.href = affiliateUrl('サブスク管理 ノート');
}

// ai-chat-tools/ai-coding-toolsの各プラン表(2026年8月確認済みの価格)をそのまま流用。
// 動画AIツール・電気代・減価償却費は使用量依存のため、このページでは金額を再計算せず
// 各専用計算機の試算結果をそのまま入力してもらう設計にしている。
const CHAT_OPTIONS = {
  none: { label: '利用しない', price: 0 },
  chatgpt_free: { label: 'ChatGPT 無料版', price: 0 },
  chatgpt_go: { label: 'ChatGPT Go', price: 1400 },
  chatgpt_plus: { label: 'ChatGPT Plus', price: 3180 },
  chatgpt_pro: { label: 'ChatGPT Pro', price: 16800 },
  claude_pro: { label: 'Claude Pro', price: 3180 },
  claude_max5: { label: 'Claude Max 5x', price: 15900 },
  claude_max20: { label: 'Claude Max 20x', price: 31800 },
  gemini_plus: { label: 'Google AI Plus', price: 725 },
  gemini_pro: { label: 'Google AI Pro', price: 2900 },
  gemini_ultra5: { label: 'Google AI Ultra 5x', price: 14500 },
  gemini_ultra20: { label: 'Google AI Ultra 20x', price: 32000 },
};

const CODING_OPTIONS = {
  none: { label: '利用しない', price: 0 },
  copilot_free: { label: 'GitHub Copilot Free', price: 0 },
  copilot_pro: { label: 'GitHub Copilot Pro', price: 1590 },
  codex_go: { label: 'OpenAI Codex(ChatGPT Go)', price: 1400 },
  claude_pro_code: { label: 'Claude Code Pro', price: 3180 },
  cursor_pro: { label: 'Cursor Pro', price: 3180 },
  copilot_proplus: { label: 'GitHub Copilot Pro+', price: 6200 },
  codex_plus: { label: 'OpenAI Codex(ChatGPT Plus)', price: 3180 },
  claude_max5_code: { label: 'Claude Code Max 5x', price: 15900 },
  cursor_proplus: { label: 'Cursor Pro+', price: 9540 },
  copilot_max: { label: 'GitHub Copilot Max', price: 15900 },
  codex_pro: { label: 'OpenAI Codex(ChatGPT Pro)', price: 16800 },
  claude_max20_code: { label: 'Claude Code Max 20x', price: 31800 },
  cursor_ultra: { label: 'Cursor Ultra', price: 31800 },
};

const selectChat = document.getElementById('select-chat');
const selectCoding = document.getElementById('select-coding');
const inputVideo = document.getElementById('input-video');
const inputElec = document.getElementById('input-elec');
const inputDepreciation = document.getElementById('input-depreciation');
const inputOther = document.getElementById('input-other');

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');
const resultBreakdown = document.getElementById('result-breakdown');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
let lastTotal = 0;

function yen(n) {
  return Math.round(n).toLocaleString('ja-JP');
}

// 収益文脈の参考値(他ページと同じ出典): Kindle絵本(¥480・KDP70%印税想定)の印税目安¥336/冊。
function bookEquivalentNote(monthlyCost) {
  const perBook = 480 * 0.7;
  if (monthlyCost < perBook) return '';
  const books = Math.round(monthlyCost / perBook);
  return ` 参考までに、Kindle絵本1冊(¥480・70%印税想定、配信コスト控除前の概算)に換算すると、月あたり約${books}冊分の売上に相当する金額です。`;
}

function clampNonNegative(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function calc() {
  const chat = CHAT_OPTIONS[selectChat.value] || CHAT_OPTIONS.none;
  const coding = CODING_OPTIONS[selectCoding.value] || CODING_OPTIONS.none;
  const video = clampNonNegative(inputVideo.value);
  const elec = clampNonNegative(inputElec.value);
  const depreciation = clampNonNegative(inputDepreciation.value);
  const other = clampNonNegative(inputOther.value);

  const items = [
    { label: `生成AIチャットツール(${chat.label})`, amount: chat.price },
    { label: `AIコーディングツール(${coding.label})`, amount: coding.price },
    { label: '動画生成AIツール', amount: video },
    { label: 'パソコン電気代', amount: elec },
    { label: '減価償却費(月割り)', amount: depreciation },
    { label: 'その他', amount: other },
  ];

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const yearly = total * 12;

  resultAmount.textContent = yen(total);
  resultNote.textContent = '選択・入力した項目の月額合計です。';
  resultSub.textContent = `年間換算:約¥${yen(yearly)}`;

  let advice = 'これは月額サブスクの合計目安です。動画AIツール・電気代・減価償却費は使用量によって変わるため、各専用計算機での試算結果を入力してください。';
  advice += bookEquivalentNote(total);
  resultAdvice.textContent = advice;

  const nonZeroItems = items.filter((item) => item.amount > 0);
  if (nonZeroItems.length > 0) {
    resultBreakdown.innerHTML = nonZeroItems
      .map((item) => `<div class="breakdown-plain-row"><span>${item.label}</span><span>¥${yen(item.amount)}</span></div>`)
      .join('') + `<div class="breakdown-plain-row"><span>合計</span><span>¥${yen(total)}</span></div>`;
    resultBreakdown.classList.add('show');
  } else {
    resultBreakdown.innerHTML = '';
    resultBreakdown.classList.remove('show');
  }

  resultCard.classList.add('show');
  if (affCard) affCard.classList.add('show');
  lastTotal = total;
  updateShareUrl();
  shareRow.classList.add('show');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('chat', selectChat.value);
  params.set('coding', selectCoding.value);
  params.set('video', inputVideo.value);
  params.set('elec', inputElec.value);
  params.set('depreciation', inputDepreciation.value);
  params.set('other', inputOther.value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(total) {
  return `AI副業の月間コスト合計を試算しました。\n月額目安:¥${yen(total)}\n`;
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
  const text = shareText(lastTotal);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const chat = params.get('chat');
  if (chat && CHAT_OPTIONS[chat]) selectChat.value = chat;
  const coding = params.get('coding');
  if (coding && CODING_OPTIONS[coding]) selectCoding.value = coding;
  const video = params.get('video');
  if (video !== null) inputVideo.value = video;
  const elec = params.get('elec');
  if (elec !== null) inputElec.value = elec;
  const depreciation = params.get('depreciation');
  if (depreciation !== null) inputDepreciation.value = depreciation;
  const other = params.get('other');
  if (other !== null) inputOther.value = other;

  if (chat || coding || video || elec || depreciation || other) calc();
}

initFromQuery();
