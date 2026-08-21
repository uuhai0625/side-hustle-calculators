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
  const url = new URL('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701');
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

function upscaleImage(url) {
  return url.replace(/_ex=\d+x\d+/, '_ex=300x300');
}

function cardHtml(item) {
  const imgRaw = item.mediumImageUrls && item.mediumImageUrls[0];
  const img = upscaleImage(typeof imgRaw === 'string' ? imgRaw : (imgRaw && imgRaw.imageUrl) || '');
  const price = Number(item.itemPrice).toLocaleString('ja-JP');
  const name = String(item.itemName || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `
    <a class="product-card" href="${item.itemUrl}" target="_blank" rel="noopener sponsored">
      <img src="${img}" alt="${name}" loading="lazy">
      <p class="product-name">${name}</p>
      <p class="product-price">¥${price}</p>
    </a>`;
}

const CATEGORIES = {
  pc:     { label: 'パソコン・タブレット(液晶ペンタブレット含む)', years: 4 },
  camera: { label: 'カメラ・ビデオカメラ', years: 5 },
  office: { label: 'モニター・プリンター・スキャナーなどの事務機器', years: 5 },
  custom: { label: 'その他(耐用年数を直接指定)', years: null },
};

// 少額減価償却資産の特例(措法28の2): 2026年4月1日以後取得分は対象額が40万円未満に拡大(それ以前は30万円未満)。
// 年間の合計上限300万円は改正後も変わらない。
const TOKUREI_THRESHOLD_NEW = 400000;
const TOKUREI_THRESHOLD_OLD = 300000;
const TOKUREI_REFORM_YM = '2026-04';
const TOKUREI_YEARLY_CAP = 3000000;

const selectCategory = document.getElementById('select-category');
const categoryYearsHint = document.getElementById('category-years-hint');
const fieldCustomYears = document.getElementById('field-custom-years');
const inputCustomYears = document.getElementById('input-custom-years');
const inputAmount = document.getElementById('input-amount');
const inputAcquired = document.getElementById('input-acquired');
const filingRadios = document.querySelectorAll('input[name="filing"]');
const fieldMethod = document.getElementById('field-method');
const selectMethod = document.getElementById('select-method');

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');
const resultBreakdown = document.getElementById('result-breakdown');
const scheduleBox = document.getElementById('schedule-box');
const scheduleNote = document.getElementById('schedule-note');
const scheduleTable = document.getElementById('schedule-table');
const affCard = document.getElementById('aff-card');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');

let base = null; // 直近のcalc()で確定した各種条件(方式切り替え時の再計算に使う)
let lastResultText = '';

function yen(n) {
  return Math.round(n).toLocaleString('ja-JP');
}

function currentYears() {
  const cat = CATEGORIES[selectCategory.value];
  if (cat.years) return cat.years;
  return Math.max(2, Math.min(20, Math.round(Number(inputCustomYears.value) || 8)));
}

function updateCategoryUI() {
  const cat = CATEGORIES[selectCategory.value];
  fieldCustomYears.style.display = selectCategory.value === 'custom' ? '' : 'none';
  categoryYearsHint.style.display = selectCategory.value === 'custom' ? 'none' : '';
  if (cat.years) categoryYearsHint.textContent = `法定耐用年数の目安:${cat.years}年`;
}
selectCategory.addEventListener('change', () => { updateCategoryUI(); updateMethodOptions(); });
inputCustomYears.addEventListener('input', updateMethodOptions);
inputAmount.addEventListener('input', updateMethodOptions);
inputAcquired.addEventListener('input', updateMethodOptions);
filingRadios.forEach((r) => r.addEventListener('change', updateMethodOptions));

function isBlueReturn() {
  return document.querySelector('input[name="filing"]:checked').value === 'blue';
}

function tokureiThreshold(acquiredYM) {
  return acquiredYM >= TOKUREI_REFORM_YM ? TOKUREI_THRESHOLD_NEW : TOKUREI_THRESHOLD_OLD;
}

function methodLabel(key, years, threshold) {
  if (key === 'normal') return `通常の減価償却(定額法・耐用年数${years}年)`;
  if (key === 'lump3') return '一括償却資産(3年均等・月割り不要)';
  if (key === 'instant') return `少額減価償却資産の特例(全額即時・取得価額${yen(threshold)}円未満が対象)`;
  return key;
}

function eligibleMethods(amount, blueReturn, acquiredYM, years) {
  if (amount < 100000) return { tier: 'under10', methods: [] };
  const threshold = tokureiThreshold(acquiredYM);
  const methods = [{ key: 'normal', label: methodLabel('normal', years, threshold) }];
  if (amount < 200000) methods.push({ key: 'lump3', label: methodLabel('lump3', years, threshold) });
  if (blueReturn && amount < threshold) methods.push({ key: 'instant', label: methodLabel('instant', years, threshold) });
  return { tier: 'normal', methods, threshold };
}

function updateMethodOptions() {
  const amount = Math.max(0, Math.round(Number(inputAmount.value) || 0));
  const acquiredYM = inputAcquired.value || defaultAcquiredYM();
  const years = currentYears();
  const { tier, methods } = eligibleMethods(amount, isBlueReturn(), acquiredYM, years);

  if (tier === 'under10' || methods.length <= 1) {
    fieldMethod.style.display = 'none';
    selectMethod.innerHTML = methods.map((m) => `<option value="${m.key}">${m.label}</option>`).join('');
    return;
  }
  const prevValue = selectMethod.value;
  selectMethod.innerHTML = methods.map((m) => `<option value="${m.key}">${m.label}</option>`).join('');
  if (methods.some((m) => m.key === prevValue)) selectMethod.value = prevValue;
  fieldMethod.style.display = '';
}

selectMethod.addEventListener('change', () => {
  if (base) renderForMethod(selectMethod.value);
});

function computeNormalSchedule(amount, years, ay, am) {
  const rate = 1 / years;
  const annual = Math.max(1, Math.floor(amount * rate));
  const target = amount - 1; // 備忘価額1円を残して償却しきる
  const monthsYear1 = 13 - am;
  let year1 = Math.min(Math.floor((annual * monthsYear1) / 12), target);
  const rows = [{ year: ay, amount: year1, note: `${monthsYear1}か月分` }];
  let cumulative = year1;
  let y = ay + 1;
  let guard = 0;
  while (cumulative < target && guard < 60) {
    const remaining = target - cumulative;
    const thisYear = Math.min(annual, remaining);
    rows.push({ year: y, amount: thisYear, note: thisYear < annual ? '最終年(端数調整)' : '' });
    cumulative += thisYear;
    y++;
    guard++;
  }
  return rows;
}

function computeLump3Schedule(amount, ay) {
  const base3 = Math.floor(amount / 3);
  const last = amount - base3 * 2;
  return [
    { year: ay, amount: base3, note: '' },
    { year: ay + 1, amount: base3, note: '' },
    { year: ay + 2, amount: last, note: last !== base3 ? '端数調整' : '' },
  ];
}

function computeInstantSchedule(amount, ay) {
  return [{ year: ay, amount, note: '全額即時' }];
}

function defaultAcquiredYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function calc() {
  const amount = Math.max(0, Math.round(Number(inputAmount.value) || 0));
  const acquiredYM = inputAcquired.value || defaultAcquiredYM();
  const years = currentYears();
  const blueReturn = isBlueReturn();
  const category = CATEGORIES[selectCategory.value];

  const { tier, methods, threshold } = eligibleMethods(amount, blueReturn, acquiredYM, years);

  if (tier === 'under10') {
    base = null;
    resultCard.classList.add('show');
    resultAmount.textContent = yen(amount);
    resultNote.textContent = '10万円未満のため、購入した年に全額を消耗品費として経費計上できます。';
    resultSub.textContent = '減価償却は不要です(この計算機の対象外)。';
    resultAdvice.textContent = '';
    resultBreakdown.innerHTML = '';
    resultBreakdown.classList.remove('show');
    scheduleBox.classList.remove('show');
    shareRow.classList.add('show');
    affCard.href = affiliateUrl('資産管理 ラベルライター');
    affCard.classList.add('show');
    showProducts('ラベルライター 家庭用', '固定資産の管理に人気のアイテム');
    updateShareUrl();
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  if (fieldMethod.style.display !== 'none' && methods.some((m) => m.key === selectMethod.value)) {
    // ユーザーが選んだ方式を維持
  } else {
    selectMethod.value = methods[0].key;
  }

  base = { amount, acquiredYM, years, blueReturn, category, methods, threshold };
  renderForMethod(selectMethod.value);
  affCard.href = affiliateUrl('資産管理 ラベルライター');
  affCard.classList.add('show');
  showProducts('ラベルライター 家庭用', '固定資産の管理に人気のアイテム');
}

function renderForMethod(methodKey) {
  if (!base) return;
  const { amount, acquiredYM, years, methods, threshold } = base;
  const [ayStr, amStr] = acquiredYM.split('-');
  const ay = Number(ayStr);
  const am = Number(amStr);

  let rows;
  if (methodKey === 'lump3') rows = computeLump3Schedule(amount, ay);
  else if (methodKey === 'instant') rows = computeInstantSchedule(amount, ay);
  else rows = computeNormalSchedule(amount, years, ay, am);

  const firstYear = rows[0];
  const methodObj = methods.find((m) => m.key === methodKey) || methods[0];

  resultCard.classList.add('show');
  resultAmount.textContent = yen(firstYear.amount);
  resultNote.textContent = `${base.category.label} 取得価額¥${yen(amount)} / ${methodObj.label}`;

  if (methodKey === 'normal') {
    resultSub.textContent = `完了予定:${rows[rows.length - 1].year}年(初年度は${13 - am}か月分で按分)`;
  } else if (methodKey === 'lump3') {
    resultSub.textContent = `${ay}〜${ay + 2}年の3年間で均等に経費化(月割り不要)`;
  } else {
    resultSub.textContent = `${ay}年に全額を経費計上(年間合計¥${yen(TOKUREI_YEARLY_CAP)}が上限)`;
  }

  let advice = `耐用年数${years}年・取得${ay}年${am}月を前提に、定額法の償却率(1/耐用年数)で計算しています。国税庁の償却率表とは端数処理で若干異なる場合があります。`;
  if (methodKey === 'instant') {
    advice += ` 少額減価償却資産の特例は青色申告者専用で、取得価額${yen(threshold)}円未満が対象、年間合計${yen(TOKUREI_YEARLY_CAP)}円が上限です(他の資産と合算して判定します)。`;
  } else if (methodKey === 'lump3') {
    advice += ' 一括償却資産は取得月に関わらず月割り計算が不要で、青色・白色どちらの申告でも選べます。';
  }
  resultAdvice.textContent = advice;

  if (methods.length > 1) {
    resultBreakdown.innerHTML = methods
      .map((m) => {
        const r = methodKey === m.key ? rows : (m.key === 'lump3' ? computeLump3Schedule(amount, ay) : m.key === 'instant' ? computeInstantSchedule(amount, ay) : computeNormalSchedule(amount, years, ay, am));
        return `<div class="breakdown-plain-row"><span>${m.label}</span><span>¥${yen(r[0].amount)}(初年度)</span></div>`;
      })
      .join('');
    resultBreakdown.classList.add('show');
  } else {
    resultBreakdown.innerHTML = '';
    resultBreakdown.classList.remove('show');
  }

  scheduleNote.textContent = `${methodObj.label}を選んだ場合の、年ごとの経費計上額です。`;
  scheduleTable.innerHTML =
    '<tr><th>年</th><th>経費計上額</th></tr>' +
    rows.map((r) => `<tr><td>${r.year}年${r.note ? `(${r.note})` : ''}</td><td>¥${yen(r.amount)}</td></tr>`).join('');
  scheduleBox.classList.add('show');

  lastResultText = `${base.category.label}(取得価額¥${yen(amount)})の減価償却を試算しました。\n${methodObj.label}:初年度¥${yen(firstYear.amount)}\n`;
  updateShareUrl();
  shareRow.classList.add('show');
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('category', selectCategory.value);
  if (selectCategory.value === 'custom') params.set('years', inputCustomYears.value);
  params.set('amount', inputAmount.value);
  params.set('acquired', inputAcquired.value);
  params.set('filing', isBlueReturn() ? 'blue' : 'white');
  if (fieldMethod.style.display !== 'none') params.set('method', selectMethod.value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
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
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(lastResultText)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

function initFromQuery() {
  inputAcquired.value = defaultAcquiredYM();
  const params = new URLSearchParams(location.search);
  const category = params.get('category');
  if (category && CATEGORIES[category]) selectCategory.value = category;
  const years = params.get('years');
  if (years) inputCustomYears.value = years;
  updateCategoryUI();

  const amount = params.get('amount');
  if (amount) inputAmount.value = amount;
  const acquired = params.get('acquired');
  if (acquired) inputAcquired.value = acquired;
  const filing = params.get('filing');
  if (filing === 'white') document.querySelector('input[name="filing"][value="white"]').checked = true;

  updateMethodOptions();
  const method = params.get('method');
  if (method) selectMethod.value = method;

  if (amount || acquired || category) calc();
}

initFromQuery();
