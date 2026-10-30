// AIサブスクの経費計算機(2026-10-31公開、No.123)。月額 × 今年使った月数 × 副業で使う割合 で今年の経費額を出す。
// プリセットの月額はgetsugaku-goukei(チャット・コーディング、2026年8〜10月確認)とdouga-ryokin(Midjourney、2026-10-16確認)の
// 価格表と同じ値。ドル建ては159円/ドルで換算した目安なので、実額はカード明細の円額に書き換えてもらう。
const SERVICES = {
  chatgpt_go: { label: 'ChatGPT Go', price: 1272 },
  chatgpt_plus: { label: 'ChatGPT Plus', price: 3180 },
  chatgpt_pro: { label: 'ChatGPT Pro $100', price: 15900 },
  chatgpt_pro200: { label: 'ChatGPT Pro $200', price: 31800 },
  claude_pro: { label: 'Claude Pro', price: 3180 },
  claude_max5: { label: 'Claude Max 5x', price: 15900 },
  claude_max20: { label: 'Claude Max 20x', price: 31800 },
  gemini_plus: { label: 'Google AI Plus', price: 725 },
  gemini_pro: { label: 'Google AI Pro', price: 2900 },
  gemini_ultra5: { label: 'Google AI Ultra 5x', price: 14500 },
  copilot_pro: { label: 'GitHub Copilot Pro', price: 1590 },
  copilot_proplus: { label: 'GitHub Copilot Pro+', price: 6200 },
  cursor_plus: { label: 'Cursor Plus', price: 1272 },
  cursor_premium: { label: 'Cursor Premium', price: 4770 },
  mj_basic: { label: 'Midjourney Basic', price: 1590 },
  mj_standard: { label: 'Midjourney Standard', price: 4770 },
  mj_pro: { label: 'Midjourney Pro', price: 9540 },
  mj_mega: { label: 'Midjourney Mega', price: 19080 },
  other: { label: 'その他のサービス', price: null },
};

const selectService = document.getElementById('select-service');
const inputPrice = document.getElementById('input-price');
const inputMonths = document.getElementById('input-months');
const inputRatio = document.getElementById('input-ratio');

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
}

selectService.addEventListener('change', () => {
  const s = SERVICES[selectService.value];
  if (s && s.price !== null) inputPrice.value = s.price;
  else inputPrice.value = '';
  liveRecalcNow();
});

function computeAndRender() {
  const service = SERVICES[selectService.value] || SERVICES.other;
  const price = clamp(inputPrice.value, 0, 10000000);
  const months = clamp(inputMonths.value || 12, 1, 12);
  const ratio = clamp(inputRatio.value, 0, 100);

  // 空欄・0円のまま計算すると「¥0」と言い切ってしまうので、入力を促す。
  const missing = price <= 0 ? '月額(カード明細の円の金額)' : String(inputRatio.value).trim() === '' ? '副業で使う割合' : '';
  if (missing) {
    resultAmount.textContent = '--';
    resultNote.textContent = `${missing}を入力してください。`;
    resultSub.textContent = '';
    resultAdvice.textContent = '';
    updateShareUrl();
    return;
  }

  const yearly = Math.round(price * months * ratio / 100);
  resultAmount.textContent = yearly.toLocaleString('ja-JP');
  resultNote.textContent = `${service.label} 月額¥${price.toLocaleString('ja-JP')} × ${months}か月 × 副業で使う割合${ratio}%`;
  resultSub.textContent = `支払った総額:¥${(price * months).toLocaleString('ja-JP')}(うち経費にしない私用分:¥${(price * months - yearly).toLocaleString('ja-JP')})`;

  let advice = '勘定科目は「通信費」や「支払手数料」がよく使われます(法令の決まりはなく、毎年同じ科目を使います)。';
  if (ratio === 0) {
    advice = '副業で使う割合が0%なので、経費にできる額はありません。';
  } else if (ratio < 100) {
    advice += '私用と兼用なので、割合の根拠(副業に使った時間のメモなど)を残しておきます。';
  }
  resultAdvice.textContent = advice;
  updateShareUrl();
}

function calc() {
  computeAndRender();
  resultCard.classList.add('show');
  shareRow.classList.add('show');
  resultCard.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

// 初回計算より後は、入力を変えるたびに結果を自動更新する(他の計算機と同じ)。
let liveRecalcTimer = null;
function scheduleLiveRecalc() {
  if (!resultCard.classList.contains('show')) return;
  clearTimeout(liveRecalcTimer);
  liveRecalcTimer = setTimeout(computeAndRender, 300);
}
function liveRecalcNow() {
  if (!resultCard.classList.contains('show')) return;
  computeAndRender();
}
[inputPrice, inputMonths, inputRatio].forEach((el) => el.addEventListener('input', scheduleLiveRecalc));

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('service', selectService.value);
  params.set('price', inputPrice.value);
  params.set('months', inputMonths.value);
  params.set('ratio', inputRatio.value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  (window.replaceUrlQuietly || history.replaceState.bind(history))(null, '', `${location.pathname}?${params.toString()}`);
}

// コピー・X投稿の宛先URLにだけutmパラメータを付ける(アドレスバーには付けない)。
function shareUrl(medium) {
  const params = paramsFromState();
  params.set('utm_source', 'share');
  params.set('utm_medium', medium);
  params.set('utm_campaign', 'result_share');
  return `${location.origin}${location.pathname}?${params.toString()}`;
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
  const url = shareUrl('copy_link');
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('clipboard-timeout')), 1500));
    await Promise.race([navigator.clipboard.writeText(url), timeout]);
    showCopied();
  } catch (e) {
    if (legacyCopyFallback(url)) showCopied();
  }
});

function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const utmSource = params.get('utm_source');
  if (utmSource && typeof gtag === 'function') {
    gtag('event', 'share_visit', {
      utm_source: utmSource,
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      page_path: location.pathname,
    });
  }
  if (!params.has('price')) return;
  const service = params.get('service');
  // 不明なサービス名のときは、渡された月額に別のサービス名が付かないよう「その他」にする。
  selectService.value = service && Object.prototype.hasOwnProperty.call(SERVICES, service) ? service : 'other';
  inputPrice.value = params.get('price');
  if (params.get('months')) inputMonths.value = params.get('months');
  if (params.get('ratio')) inputRatio.value = params.get('ratio');
  calc();
}

initFromQuery();
// 計算後の表示はJSのshowクラスに任せる
document.documentElement.classList.remove('qshow');
