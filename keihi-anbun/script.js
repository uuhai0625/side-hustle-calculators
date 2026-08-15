// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(相場ノートと同一)。
const RAKUTEN_AFFILIATE_ID = '567f9cc6.631b3687.567f9cc7.3d3a8a85';

function affiliateUrl(keyword) {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/?s=5`;
  if (!RAKUTEN_AFFILIATE_ID) return searchUrl;
  const encoded = encodeURIComponent(searchUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9`;
}

const RAKUTEN_APP_ID = 'f9f8dd97-c7a4-4ae1-a2c1-38b4572a702e';
const RAKUTEN_ACCESS_KEY = 'pk_gJd3Q0JkttKeBF4DcfYjD8zYljezjxNxEFiUssXZhFs';
const RAKUTEN_API_AFFILIATE_ID = '567fd2ff.507b4e2c.567fd300.5261c56d';

let productRequestId = 0;

async function showProducts(keyword, labelText) {
  const grid = document.getElementById('product-grid');
  const label = document.getElementById('product-grid-label');
  if (!grid) return;
  const requestId = ++productRequestId;
  grid.innerHTML = '';
  grid.classList.remove('show');
  if (label) label.style.display = 'none';
  const url = new URL('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601');
  url.searchParams.set('applicationId', RAKUTEN_APP_ID);
  url.searchParams.set('accessKey', RAKUTEN_ACCESS_KEY);
  url.searchParams.set('affiliateId', RAKUTEN_API_AFFILIATE_ID);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('sort', '-reviewCount');
  url.searchParams.set('hits', '4');
  url.searchParams.set('format', 'json');
  try {
    const res = await fetch(url.toString());
    if (requestId !== productRequestId) return;
    if (!res.ok) return;
    const data = await res.json();
    if (requestId !== productRequestId) return;
    const items = (data.Items || []).map((entry) => entry.Item || entry);
    if (!items.length) return;
    grid.innerHTML = `<div class="product-band"><div class="product-band-grid">${items.map(cardHtml).join('')}</div></div>`;
    grid.classList.add('show');
    if (label) { label.textContent = labelText; label.style.display = ''; }
  } catch (e) {
    // 失敗時は既存の検索リンクCTA(aff-card)に静かにフォールバック
  }
}

// 楽天のサムネイルCDNはURL末尾の_ex=WxHパラメータで実際の画素数が変わる
// (mediumImageUrlsは既定で128x128、レスポンシブなカード表示には粗すぎるため300x300に引き上げる)。
function upscaleImage(url) {
  return url.replace(/_ex=\d+x\d+/, '_ex=300x300');
}

function cardHtml(item) {
  const imgRaw = item.mediumImageUrls && item.mediumImageUrls[0];
  const img = upscaleImage(typeof imgRaw === 'string' ? imgRaw : (imgRaw && imgRaw.imageUrl) || '');
  const price = Number(item.itemPrice).toLocaleString('ja-JP');
  const name = String(item.itemName || '').replace(/</g, '&lt;');
  return `
    <a class="product-card" href="${item.itemUrl}" target="_blank" rel="noopener sponsored">
      <img src="${img}" alt="" loading="lazy">
      <p class="product-name">${name}</p>
      <p class="product-price">¥${price}</p>
    </a>`;
}

const EXPENSES = {
  electricity: { label: '電気代', icon: '💡' },
  rent:        { label: '家賃(管理費・共益費含む)', icon: '🏠' },
  internet:    { label: '通信費(自宅のネット回線)', icon: '📶' },
  phone:       { label: 'スマホ代', icon: '📱' },
  other:       { label: 'その他の費用', icon: '🧾' },
};

let mode = 'time';
const tabButtons = document.querySelectorAll('.scene-tab');
const fieldsTime = document.getElementById('fields-time');
const fieldsArea = document.getElementById('fields-area');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    tabButtons.forEach((b) => b.classList.toggle('active', b === btn));
    fieldsTime.style.display = mode === 'time' ? '' : 'none';
    fieldsArea.style.display = mode === 'area' ? '' : 'none';
  });
});

const selectExpense = document.getElementById('select-expense');
const inputAmount = document.getElementById('input-amount');
const inputHours = document.getElementById('input-hours');
const inputWorkdays = document.getElementById('input-workdays');
const inputWorkArea = document.getElementById('input-work-area');
const inputTotalArea = document.getElementById('input-total-area');
const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');
const affCard = document.getElementById('aff-card');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
let lastMonthly = 0;
let lastRatioPct = 0;

function calcRatio() {
  if (mode === 'time') {
    const hours = Math.max(0, Number(inputHours.value) || 0);
    const workdays = Math.max(0, Math.min(7, Number(inputWorkdays.value) || 0));
    const weeklyHours = hours * workdays;
    return weeklyHours / (24 * 7);
  }
  const workArea = Math.max(0, Number(inputWorkArea.value) || 0);
  const totalArea = Math.max(0.1, Number(inputTotalArea.value) || 0.1);
  return Math.min(1, workArea / totalArea);
}

function calc() {
  const expense = EXPENSES[selectExpense.value];
  const amount = Math.max(0, Number(inputAmount.value) || 0);
  const ratio = Math.min(1, calcRatio());
  const ratioPct = Math.round(ratio * 1000) / 10;
  const monthlyCost = Math.round(amount * ratio);
  const yearlyCost = monthlyCost * 12;

  resultAmount.textContent = monthlyCost.toLocaleString('ja-JP');
  resultNote.textContent = `${expense.label} 月額¥${amount.toLocaleString('ja-JP')} × 按分率${ratioPct}%`;
  resultSub.textContent = `年間換算:約¥${yearlyCost.toLocaleString('ja-JP')}(${mode === 'time' ? '時間按分' : '面積按分'})`;

  let advice = `按分率${ratioPct}%は、${mode === 'time' ? '週あたりの使用時間 ÷ 168時間' : '作業スペースの面積 ÷ 延床面積'}で算出した目安です。`;
  if (ratioPct < 50) {
    advice += ' 白色申告の場合、業務利用が50%未満だと「明確に区分できる」ことを説明できるようにしておく必要があるとされています。青色申告なら50%未満でも合理的な基準として計上できるとされています(いずれも税務上の最終判断は税理士・税務署にご確認ください)。';
  } else {
    advice += ' 50%を超えているため、白色申告でも比較的説明しやすい水準です(最終判断は税理士・税務署にご確認ください)。';
  }
  resultAdvice.textContent = advice;

  resultCard.classList.add('show');
  lastMonthly = monthlyCost;
  lastRatioPct = ratioPct;
  updateShareUrl();
  shareRow.classList.add('show');

  affCard.href = affiliateUrl('領収書 ファイル 整理');
  affCard.classList.add('show');
  showProducts('書類 ファイルボックス', '経費の記録・管理に人気のアイテム');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('mode', mode);
  params.set('expense', selectExpense.value);
  params.set('amount', inputAmount.value);
  if (mode === 'time') {
    params.set('hours', inputHours.value);
    params.set('workdays', inputWorkdays.value);
  } else {
    params.set('workarea', inputWorkArea.value);
    params.set('totalarea', inputTotalArea.value);
  }
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(amount, ratioPct) {
  return `副業の経費按分を計算しました。\n按分率:${ratioPct}%/月間目安:¥${amount.toLocaleString('ja-JP')}\n`;
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
  const text = shareText(lastMonthly, lastRatioPct);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const qMode = params.get('mode');
  if (!qMode || (qMode !== 'time' && qMode !== 'area')) return;
  mode = qMode;
  tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  fieldsTime.style.display = mode === 'time' ? '' : 'none';
  fieldsArea.style.display = mode === 'area' ? '' : 'none';

  const expense = params.get('expense');
  if (expense && EXPENSES[expense]) selectExpense.value = expense;
  const amount = params.get('amount');
  if (amount) inputAmount.value = amount;
  if (mode === 'time') {
    const hours = params.get('hours');
    if (hours) inputHours.value = hours;
    const workdays = params.get('workdays');
    if (workdays) inputWorkdays.value = workdays;
  } else {
    const workarea = params.get('workarea');
    if (workarea) inputWorkArea.value = workarea;
    const totalarea = params.get('totalarea');
    if (totalarea) inputTotalArea.value = totalarea;
  }
  calc();
}

initFromQuery();
