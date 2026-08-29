// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(相場ノート・副業そろばん他ページと同一)。
const RAKUTEN_AFFILIATE_ID = '567f9cc6.631b3687.567f9cc7.3d3a8a85';

// 楽天ふるさと納税の検索ページはev=40のイベント検索(通常のsearch/mallとは別URL体系)。
function furusatoSearchUrl(keyword, maxPrice) {
  const params = new URLSearchParams({ ev: '40' });
  if (maxPrice) params.set('max', String(Math.floor(maxPrice)));
  return `https://search.rakuten.co.jp/search/event/${encodeURIComponent(keyword)}/?${params.toString()}`;
}

function affiliateUrl(searchUrl) {
  if (!RAKUTEN_AFFILIATE_ID) return searchUrl;
  const encoded = encodeURIComponent(searchUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9`;
}

const RAKUTEN_APP_ID = 'f9f8dd97-c7a4-4ae1-a2c1-38b4572a702e';
const RAKUTEN_ACCESS_KEY = 'pk_gJd3Q0JkttKeBF4DcfYjD8zYljezjxNxEFiUssXZhFs';
const RAKUTEN_API_AFFILIATE_ID = '567fd2ff.507b4e2c.567fd300.5261c56d';

let productRequestId = 0;

// 一般のIchibaItem検索APIには「ふるさと納税」専用の絞り込みパラメータがないため、
// キーワードに「ふるさと納税」を含めて検索する(返礼品は商品名に含まれることがほとんど)。
async function showFurusatoProducts(category, maxPrice) {
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
  url.searchParams.set('keyword', `ふるさと納税 ${category}`);
  if (maxPrice) url.searchParams.set('maxPrice', String(Math.floor(maxPrice)));
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
    if (label) { label.textContent = 'あなたの上限額で選べる人気の返礼品'; label.style.display = ''; }
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
  const name = String(item.itemName || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `
    <a class="product-card" href="${item.itemUrl}" target="_blank" rel="noopener sponsored">
      <span class="pr-badge">PR</span>
      <img src="${img}" alt="${name}" loading="lazy" width="300" height="300">
      <p class="product-name">${name}</p>
      <p class="product-price">¥${price}</p>
    </a>`;
}

// --- 給与所得控除(2020年分以降の速算表) ---
function salaryDeduction(income) {
  if (income <= 1625000) return 550000;
  if (income <= 1800000) return income * 0.4 - 100000;
  if (income <= 3600000) return income * 0.3 + 80000;
  if (income <= 6600000) return income * 0.2 + 440000;
  if (income <= 8500000) return income * 0.1 + 1100000;
  return 1950000;
}

// --- 所得税の基礎控除(令和7・8年分、合計所得金額ベース) ---
function incomeTaxBasicDeduction(totalIncome) {
  if (totalIncome <= 1320000) return 950000;
  if (totalIncome <= 3360000) return 880000;
  if (totalIncome <= 4890000) return 680000;
  if (totalIncome <= 6550000) return 630000;
  if (totalIncome <= 23500000) return 580000;
  return 480000;
}

// --- 所得税の限界税率(超過累進、速算表) ---
function marginalIncomeTaxRate(taxableIncome) {
  if (taxableIncome <= 1950000) return 0.05;
  if (taxableIncome <= 3300000) return 0.10;
  if (taxableIncome <= 6950000) return 0.20;
  if (taxableIncome <= 9000000) return 0.23;
  if (taxableIncome <= 18000000) return 0.33;
  if (taxableIncome <= 40000000) return 0.40;
  return 0.45;
}

const SIDE_TYPE_LABEL = {
  zatsu: '雑所得',
  white: '事業所得(白色申告)',
  blue10: '事業所得(青色申告・10万円控除)',
  blue65: '事業所得(青色申告・65万円控除)',
};

function calcResult(input) {
  const salaryIncome = Math.max(0, input.salary - salaryDeduction(input.salary));
  const sideProfit = Math.max(0, input.sideIncome - input.sideExpense);
  const blueDeduction = input.sideType === 'blue65' ? 650000 : input.sideType === 'blue10' ? 100000 : 0;
  const sideTaxableIncome = Math.max(0, sideProfit - blueDeduction);

  const totalIncome = salaryIncome + sideTaxableIncome;
  const socialInsuranceDeduction = input.salary * 0.15;
  const spouseDeductionResident = input.hasSpouse ? 330000 : 0;
  const spouseDeductionIncomeTax = input.hasSpouse ? 380000 : 0;
  const dependentsDeductionResident = input.dependents * 330000;
  const dependentsDeductionIncomeTax = input.dependents * 380000;

  const residentBasicDeduction = 430000;
  const residentTaxableRaw = totalIncome - socialInsuranceDeduction - spouseDeductionResident - dependentsDeductionResident - residentBasicDeduction;
  const residentTaxable = Math.floor(Math.max(0, residentTaxableRaw) / 1000) * 1000;
  const residentIncomeLevy = residentTaxable * 0.10;

  const incomeTaxBasic = incomeTaxBasicDeduction(totalIncome);
  const incomeTaxableRaw = totalIncome - socialInsuranceDeduction - spouseDeductionIncomeTax - dependentsDeductionIncomeTax - incomeTaxBasic;
  const incomeTaxable = Math.floor(Math.max(0, incomeTaxableRaw) / 1000) * 1000;
  const rate = marginalIncomeTaxRate(incomeTaxable);

  const rawLimit = (residentIncomeLevy * 0.20) / (0.90 - rate * 1.021) + 2000;
  const limit = Math.max(0, Math.floor(rawLimit / 1000) * 1000);

  return {
    salaryIncome, sideProfit, blueDeduction, sideTaxableIncome, totalIncome,
    residentIncomeLevy, incomeTaxable, rate, limit,
    needsFinalReturn: sideTaxableIncome > 200000,
    blueAbsorbed: (input.sideType === 'blue10' || input.sideType === 'blue65') && sideProfit <= blueDeduction && sideProfit > 0,
    outOfScope: totalIncome > 24000000,
  };
}

const inputSalary = document.getElementById('input-salary');
const selectSpouse = document.getElementById('select-spouse');
const inputDependents = document.getElementById('input-dependents');
const inputSideIncome = document.getElementById('input-side-income');
const inputSideExpense = document.getElementById('input-side-expense');
const selectSideType = document.getElementById('select-side-type');
const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');
const resultClampNotice = document.getElementById('result-clamp-notice');
const affCard = document.getElementById('aff-card');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
const productCategoryField = document.getElementById('product-category-field');
const selectProductCategory = document.getElementById('select-product-category');
let lastLimit = 0;

function readInput() {
  return {
    salary: Math.max(0, Number(inputSalary.value) || 0),
    hasSpouse: selectSpouse.value === '1',
    dependents: Math.min(10, Math.max(0, Number(inputDependents.value) || 0)),
    sideIncome: Math.max(0, Number(inputSideIncome.value) || 0),
    sideExpense: Math.max(0, Number(inputSideExpense.value) || 0),
    sideType: selectSideType.value,
  };
}

function calc() {
  const input = readInput();
  const r = calcResult(input);

  resultAmount.textContent = r.limit.toLocaleString('ja-JP');
  resultNote.textContent = `給与所得¥${Math.round(r.salaryIncome).toLocaleString('ja-JP')} + 副業所得¥${Math.round(r.sideTaxableIncome).toLocaleString('ja-JP')}(${SIDE_TYPE_LABEL[input.sideType]}) = 総所得金額¥${Math.round(r.totalIncome).toLocaleString('ja-JP')}`;
  resultSub.textContent = `住民税所得割額(概算):¥${Math.round(r.residentIncomeLevy).toLocaleString('ja-JP')} / 適用した所得税率(限界):${Math.round(r.rate * 100)}%`;

  let notices = [];
  if (r.needsFinalReturn) {
    notices.push('副業所得が年20万円を超えているため、原則として確定申告が必要になり、ワンストップ特例制度は利用できません。');
  }
  if (r.blueAbsorbed) {
    notices.push('副業の利益が青色申告特別控除額の範囲内に収まっているため、総所得金額への算入額は0円です(上限額は給与のみの場合とほぼ変わりません)。');
  }
  if (r.outOfScope) {
    notices.push('総所得金額が2,400万円を超えており、この計算機が想定する範囲外です。基礎控除の逓減など考慮していない要素があるため、表示額の精度はさらに低くなります。');
  }
  if (notices.length) {
    resultClampNotice.textContent = `※ ${notices.join(' ')}`;
    resultClampNotice.classList.add('show');
  } else {
    resultClampNotice.classList.remove('show');
  }

  resultAdvice.textContent = 'これは概算です。社会保険料控除は給与収入の15%、住民税の調整控除は考慮せずに計算しています。正確な金額は前年の住民税課税決定通知書等でご確認のうえ、実際の寄附は上限額よりやや少なめにするのが安全です(税務上の最終判断は税理士・税務署にご確認ください)。';

  resultCard.classList.add('show');
  lastLimit = r.limit;
  updateShareUrl(input);
  shareRow.classList.add('show');

  productCategoryField.style.display = '';
  const category = selectProductCategory.value;
  affCard.href = affiliateUrl(furusatoSearchUrl(category, r.limit));
  affCard.classList.add('show');
  showFurusatoProducts(category, r.limit || 3000);

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

selectProductCategory.addEventListener('change', () => {
  const category = selectProductCategory.value;
  affCard.href = affiliateUrl(furusatoSearchUrl(category, lastLimit));
  showFurusatoProducts(category, lastLimit || 3000);
});

function paramsFromState(input) {
  const params = new URLSearchParams();
  params.set('salary', input.salary);
  params.set('spouse', selectSpouse.value);
  params.set('dependents', input.dependents);
  params.set('sideincome', input.sideIncome);
  params.set('sideexpense', input.sideExpense);
  params.set('sidetype', input.sideType);
  return params;
}

function updateShareUrl(input) {
  const params = paramsFromState(input);
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(limit) {
  return `ふるさと納税の控除上限額(副業ありパターン)を計算しました。\n上限目安:¥${limit.toLocaleString('ja-JP')}\n`;
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
  const text = shareText(lastLimit);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const salary = params.get('salary');
  if (!salary) return;
  inputSalary.value = salary;
  const spouse = params.get('spouse');
  if (spouse === '0' || spouse === '1') selectSpouse.value = spouse;
  const dependents = params.get('dependents');
  if (dependents) inputDependents.value = dependents;
  const sideIncome = params.get('sideincome');
  if (sideIncome) inputSideIncome.value = sideIncome;
  const sideExpense = params.get('sideexpense');
  if (sideExpense) inputSideExpense.value = sideExpense;
  const sideType = params.get('sidetype');
  if (sideType && SIDE_TYPE_LABEL[sideType]) selectSideType.value = sideType;
  calc();
}

initFromQuery();
