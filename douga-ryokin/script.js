// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(相場ノート・他計算機と同一)。
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// 収益文脈の参考値(2026-08-15追加): denki-daiと同じKindle絵本(¥480・70%印税想定)換算。
function bookEquivalentNote(monthlyJpy) {
  const perBook = 480 * 0.7;
  if (monthlyJpy < perBook) return '';
  const books = Math.round(monthlyJpy / perBook);
  return ` 参考までに、Kindle絵本1冊(¥480・70%印税想定、配信コスト控除前の概算)に換算すると、月あたり約${books}冊分の売上に相当します。`;
}

// ---- ツール別の料金データ(2026年8月、Perplexity+WEB検索で複数の比較記事を横断確認した参考値) ----

const MJ_INFO = { name: 'Midjourney', url: 'https://www.midjourney.com/' };
const MJ_PLANS = {
  basic:    { label: 'Basic($10)', priceUsd: 10, fastMin: 198 },
  standard: { label: 'Standard($30)', priceUsd: 30, fastMin: 900 },
  pro:      { label: 'Pro($60)', priceUsd: 60, fastMin: 1800 },
  mega:     { label: 'Mega($120)', priceUsd: 120, fastMin: 3600 },
};
const MJ_STILL_MIN = 1;      // 静止画1枚あたりのFast時間の目安(分)
const MJ_ANIMATE_MIN = 26;   // 動画化(Animate)1本あたりのFast時間の目安(分)
const MJ_EXTRA_USD_PER_MIN = 4 / 60; // 追加Fast時間は$4/時間

const RW_INFO = { name: 'Runway', url: 'https://runwayml.com/' };
const RW_PLANS = {
  standard: { label: 'Standard($15)', priceUsd: 15, credits: 625 },
  pro:      { label: 'Pro($35)', priceUsd: 35, credits: 2250 },
  max:      { label: 'Max($95)', priceUsd: 95, credits: 9500 },
};
const RW_MODELS = {
  gen45:     { label: 'Gen-4.5', creditsPerSec: 25 },
  gen4:      { label: 'Gen-4', creditsPerSec: 12 },
  gen4turbo: { label: 'Gen-4 Turbo', creditsPerSec: 5 },
};
const RW_EXTRA_USD_PER_CREDIT = 0.01; // 追加クレジットは公開されているAPI従量課金($0.01/credit)を参考値として使用

// 「5秒動画あたりの消費クレジット」を共通の単位にして横並び比較できるようにした5ツール。
// usdPerCreditExtraは各ツールのエントリープランの実質単価から算出した参考値(公式の追加購入単価が非公開のため)。
const CREDIT5S_TOOLS = {
  kling: {
    name: 'Kling AI', url: 'https://klingai.com/',
    creditsPer5Sec: 40, usdPerCreditExtra: 0.015,
    plans: {
      standard: { label: 'Standard($10)', priceUsd: 10, credits: 660 },
      pro:      { label: 'Pro($37)', priceUsd: 37, credits: 3000 },
      premier:  { label: 'Premier($92)', priceUsd: 92, credits: 8000 },
      ultra:    { label: 'Ultra($180)', priceUsd: 180, credits: 26000 },
    },
  },
  luma: {
    name: 'Luma Dream Machine', url: 'https://lumalabs.ai/dream-machine',
    creditsPer5Sec: 330, usdPerCreditExtra: 0.00312,
    plans: {
      lite:      { label: 'Lite($9.99)', priceUsd: 9.99, credits: 3200 },
      plus:      { label: 'Plus($29.99)', priceUsd: 29.99, credits: 10000 },
      unlimited: { label: 'Unlimited($94.99)', priceUsd: 94.99, credits: 10000, relaxedUnlimited: true },
    },
  },
  pika: {
    name: 'Pika', url: 'https://pika.art/',
    creditsPer5Sec: 31, usdPerCreditExtra: 0.0143,
    plans: {
      standard: { label: 'Standard($10)', priceUsd: 10, credits: 700 },
      pro:      { label: 'Pro($35)', priceUsd: 35, credits: 2300 },
      fancy:    { label: 'Fancy($95)', priceUsd: 95, credits: 6000 },
    },
  },
  pixverse: {
    name: 'PixVerse', url: 'https://pixverse.ai/',
    creditsPer5Sec: 135, usdPerCreditExtra: 0.00667,
    plans: {
      standard: { label: 'Standard($8)', priceUsd: 8, credits: 1200 },
      pro:      { label: 'Pro($24)', priceUsd: 24, credits: 6000 },
      premium:  { label: 'Premium($48)', priceUsd: 48, credits: 15000 },
      ultra:    { label: 'Ultra($149)', priceUsd: 149, credits: 25000 },
    },
  },
  veo: {
    name: 'Google Veo', url: 'https://deepmind.google/models/veo/',
    creditsPer5Sec: 100, usdPerCreditExtra: 0.02,
    plans: {
      plus:  { label: 'AI Plus($7.99)', priceUsd: 7.99, credits: 200 },
      pro:   { label: 'AI Pro($19.99)', priceUsd: 19.99, credits: 1000 },
      ultra: { label: 'AI Ultra($99.99)', priceUsd: 99.99, credits: 10000 },
    },
  },
};

const TOOL_INFO = {
  mj: MJ_INFO, runway: RW_INFO,
  kling: CREDIT5S_TOOLS.kling, luma: CREDIT5S_TOOLS.luma, pika: CREDIT5S_TOOLS.pika,
  pixverse: CREDIT5S_TOOLS.pixverse, veo: CREDIT5S_TOOLS.veo,
};

function buildOptionsHtml(plans, selectedKey) {
  return Object.keys(plans).map((key) => {
    const p = plans[key];
    const sel = key === selectedKey ? ' selected' : '';
    return `<option value="${key}"${sel}>${p.label}</option>`;
  }).join('');
}

// credit5s系ツール共通の計算(1本あたりの秒数 → 5秒単位のクレジット消費に換算)。
function calcCredit5s(toolKey, plan, videos, seconds, rate) {
  const tool = CREDIT5S_TOOLS[toolKey];
  const neededCredits = Math.round(videos * (seconds / 5) * tool.creditsPer5Sec);
  const overCredits = Math.max(0, neededCredits - plan.credits);
  const extraUsd = plan.relaxedUnlimited ? 0 : overCredits * tool.usdPerCreditExtra;
  const totalUsd = plan.priceUsd + extraUsd;
  const totalJpy = Math.round(totalUsd * rate);
  let advice;
  if (plan.relaxedUnlimited) {
    advice = `このプランは付与クレジットを使い切っても低速の無制限モードで生成を続けられるため、追加費用は発生しない想定です。`;
  } else if (overCredits > 0) {
    advice = `プランのクレジットだけでは約${overCredits.toLocaleString('ja-JP')}クレジット足りない見込みです。追加クレジットの単価はエントリープランの実質単価($${tool.usdPerCreditExtra}/credit)を参考値にしています、正確な単価は${tool.name}のアカウント画面でご確認ください。`;
  } else {
    advice = `選んだプランのクレジットの範囲内に収まる見込みです。`;
  }
  return {
    totalUsd, totalJpy,
    note: `${tool.name} ${plan.label}、動画${videos}本×${seconds}秒で試算`,
    sub: `クレジットの目安:必要${neededCredits.toLocaleString('ja-JP')} / プラン付与${plan.credits.toLocaleString('ja-JP')}・為替${rate}円/ドル`,
    advice,
  };
}

function calcMj(plan, videos, candidates, rate) {
  const neededMin = videos * (candidates * MJ_STILL_MIN + MJ_ANIMATE_MIN);
  const overMin = Math.max(0, neededMin - plan.fastMin);
  const extraUsd = overMin * MJ_EXTRA_USD_PER_MIN;
  const totalUsd = plan.priceUsd + extraUsd;
  const totalJpy = Math.round(totalUsd * rate);
  const advice = overMin > 0
    ? `プランのFast時間だけでは約${Math.ceil(overMin / 6) / 10}時間分足りない見込みです。追加購入(1時間$4)は割高になりやすいため、必要な追加時間が大きい場合は上位プランへの切り替えも検討してください。`
    : `選んだプランのFast時間の範囲内に収まる見込みです。Fast時間は使い切っても翌月に繰り越されません。`;
  return {
    totalUsd, totalJpy,
    note: `Midjourney ${plan.label}、動画${videos}本(候補${candidates}枚+Animate)で試算`,
    sub: `Fast時間の目安:必要${neededMin}分 / プラン付与${plan.fastMin}分・為替${rate}円/ドル`,
    advice,
  };
}

function calcRunway(plan, model, videos, seconds, rate) {
  const neededCredits = videos * seconds * model.creditsPerSec;
  const overCredits = Math.max(0, neededCredits - plan.credits);
  const extraUsd = overCredits * RW_EXTRA_USD_PER_CREDIT;
  const totalUsd = plan.priceUsd + extraUsd;
  const totalJpy = Math.round(totalUsd * rate);
  const advice = overCredits > 0
    ? `プランのクレジットだけでは約${overCredits.toLocaleString('ja-JP')}クレジット足りない見込みです。追加クレジットの単価は公開されているAPI従量課金($0.01/credit)を参考値にしています、実際のサブスク追加購入パックの単価はRunwayのアカウント画面でご確認ください。`
    : `選んだプランのクレジットの範囲内に収まる見込みです。モデルを変えると秒あたりの消費クレジットが大きく変わります。`;
  return {
    totalUsd, totalJpy,
    note: `Runway ${plan.label}、${model.label}で動画${videos}本×${seconds}秒で試算`,
    sub: `クレジットの目安:必要${neededCredits.toLocaleString('ja-JP')} / プラン付与${plan.credits.toLocaleString('ja-JP')}・為替${rate}円/ドル`,
    advice,
  };
}

// ---- 単体モード ----

const selectTool = document.getElementById('select-tool');
const toolOfficialLink = document.getElementById('tool-official-link');
const fieldsMj = document.getElementById('fields-mj');
const fieldsRunway = document.getElementById('fields-runway');
const fieldsCredit5s = document.getElementById('fields-credit5s');
const selectCredit5sPlan = document.getElementById('select-credit5s-plan');
const inputC5sVideos = document.getElementById('input-c5s-videos');
const inputC5sSeconds = document.getElementById('input-c5s-seconds');

const selectMjPlan = document.getElementById('select-mj-plan');
const inputMjVideos = document.getElementById('input-mj-videos');
const inputMjCandidates = document.getElementById('input-mj-candidates');
const selectRwPlan = document.getElementById('select-rw-plan');
const selectRwModel = document.getElementById('select-rw-model');
const inputRwVideos = document.getElementById('input-rw-videos');
const inputRwSeconds = document.getElementById('input-rw-seconds');
const inputRate = document.getElementById('input-fx-rate');

// 各ツールの初期表示プラン。既定の試算条件(動画8本×5秒)で追加費用が出ない、
// 一番安いプランをデフォルトにしている(veoのみ最安のAI Plusだと既定条件で
// 足りないため、無理なく収まるAI Proを初期値にした)。
const CREDIT5S_DEFAULT_PLAN = { kling: 'standard', luma: 'lite', pika: 'standard', pixverse: 'standard', veo: 'pro' };

function refreshToolFields() {
  const tool = selectTool.value;
  fieldsMj.style.display = tool === 'mj' ? '' : 'none';
  fieldsRunway.style.display = tool === 'runway' ? '' : 'none';
  fieldsCredit5s.style.display = CREDIT5S_TOOLS[tool] ? '' : 'none';
  if (CREDIT5S_TOOLS[tool]) {
    selectCredit5sPlan.innerHTML = buildOptionsHtml(CREDIT5S_TOOLS[tool].plans, CREDIT5S_DEFAULT_PLAN[tool]);
  }
  const info = TOOL_INFO[tool];
  toolOfficialLink.href = info.url;
  toolOfficialLink.textContent = `${info.name}の公式サイトを見る →`;
}
selectTool.addEventListener('change', refreshToolFields);

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');
const resultBreakdown = document.getElementById('result-breakdown');
const affCard = document.getElementById('aff-card');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
let lastTotalJpy = 0;

function calcSingle() {
  // HTMLのmin/max属性は直接入力・クエリパラメータ経由の値を弾かないため、
  // 計算時に必ずここでも同じ範囲にクランプする(denki-daiの実装と同じ方針)。
  const rate = clamp(Number(inputRate.value) || 159, 100, 300);
  const tool = selectTool.value;
  let result;

  if (tool === 'mj') {
    const plan = MJ_PLANS[selectMjPlan.value] || MJ_PLANS.standard;
    const videos = clamp(Math.round(Number(inputMjVideos.value) || 0), 1, 60);
    const candidates = clamp(Math.round(Number(inputMjCandidates.value) || 0), 1, 20);
    result = calcMj(plan, videos, candidates, rate);
  } else if (tool === 'runway') {
    const plan = RW_PLANS[selectRwPlan.value] || RW_PLANS.standard;
    const model = RW_MODELS[selectRwModel.value] || RW_MODELS.gen4;
    const videos = clamp(Math.round(Number(inputRwVideos.value) || 0), 1, 60);
    const seconds = clamp(Math.round(Number(inputRwSeconds.value) || 0), 1, 30);
    result = calcRunway(plan, model, videos, seconds, rate);
  } else {
    const toolData = CREDIT5S_TOOLS[tool];
    const plan = toolData.plans[selectCredit5sPlan.value] || Object.values(toolData.plans)[0];
    const videos = clamp(Math.round(Number(inputC5sVideos.value) || 0), 1, 60);
    const seconds = clamp(Math.round(Number(inputC5sSeconds.value) || 0), 1, 30);
    result = calcCredit5s(tool, plan, videos, seconds, rate);
  }

  resultAmount.textContent = result.totalJpy.toLocaleString('ja-JP');
  resultNote.textContent = result.note;
  resultSub.textContent = `${result.sub}(月額目安 $${result.totalUsd.toFixed(2)})`;
  resultAdvice.textContent = result.advice + bookEquivalentNote(result.totalJpy);
  resultBreakdown.classList.remove('show');
  resultBreakdown.innerHTML = '';

  resultCard.classList.add('show');
  lastTotalJpy = result.totalJpy;
  shareRow.classList.add('show');

  affCard.href = affiliateUrl('外付けSSD');
  affCard.classList.add('show');
  showProducts('外付けSSD', '動画ファイルの保存に人気のアイテム');

  updateShareUrl();
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calcSingle);

// ---- 併用(合計)モード ----

const comboRows = [
  { key: 'mj', checkboxId: 'combo-check-mj', selectId: 'combo-plan-mj' },
  { key: 'runway', checkboxId: 'combo-check-runway', selectId: 'combo-plan-runway' },
  { key: 'kling', checkboxId: 'combo-check-kling', selectId: 'combo-plan-kling' },
  { key: 'luma', checkboxId: 'combo-check-luma', selectId: 'combo-plan-luma' },
  { key: 'pika', checkboxId: 'combo-check-pika', selectId: 'combo-plan-pika' },
  { key: 'pixverse', checkboxId: 'combo-check-pixverse', selectId: 'combo-plan-pixverse' },
  { key: 'veo', checkboxId: 'combo-check-veo', selectId: 'combo-plan-veo' },
];

function initComboSelects() {
  comboRows.forEach((row) => {
    const select = document.getElementById(row.selectId);
    if (!select) return;
    if (row.key === 'mj') { select.innerHTML = buildOptionsHtml(MJ_PLANS, 'standard'); return; }
    if (row.key === 'runway') { select.innerHTML = buildOptionsHtml(RW_PLANS, 'standard'); return; }
    select.innerHTML = buildOptionsHtml(CREDIT5S_TOOLS[row.key].plans, CREDIT5S_DEFAULT_PLAN[row.key]);
  });
}
initComboSelects();

const inputComboVideos = document.getElementById('input-combo-videos');
const inputComboSeconds = document.getElementById('input-combo-seconds');
const inputComboCandidates = document.getElementById('input-combo-candidates');
const inputComboRate = document.getElementById('input-combo-rate');

function calcCombo() {
  const rate = clamp(Number(inputComboRate.value) || 159, 100, 300);
  const videos = clamp(Math.round(Number(inputComboVideos.value) || 0), 1, 60);
  const seconds = clamp(Math.round(Number(inputComboSeconds.value) || 0), 1, 30);
  const candidates = clamp(Math.round(Number(inputComboCandidates.value) || 0), 1, 20);

  const checked = comboRows.filter((row) => document.getElementById(row.checkboxId).checked);
  if (!checked.length) {
    resultAmount.textContent = '0';
    resultNote.textContent = 'ツールを1つ以上選んでください';
    resultSub.textContent = '';
    resultAdvice.textContent = '併用したいツールにチェックを入れてから試算してください。';
    resultBreakdown.classList.remove('show');
    resultBreakdown.innerHTML = '';
    resultCard.classList.add('show');
    shareRow.classList.remove('show');
    affCard.classList.remove('show');
    document.getElementById('product-grid').classList.remove('show');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  const parts = checked.map((row) => {
    const select = document.getElementById(row.selectId);
    if (row.key === 'mj') {
      const plan = MJ_PLANS[select.value];
      return { name: MJ_INFO.name, ...calcMj(plan, videos, candidates, rate) };
    }
    if (row.key === 'runway') {
      const plan = RW_PLANS[select.value];
      const model = RW_MODELS.gen4;
      return { name: RW_INFO.name, ...calcRunway(plan, model, videos, seconds, rate) };
    }
    const toolData = CREDIT5S_TOOLS[row.key];
    const plan = toolData.plans[select.value];
    return { name: toolData.name, ...calcCredit5s(row.key, plan, videos, seconds, rate) };
  });

  const totalJpy = parts.reduce((sum, p) => sum + p.totalJpy, 0);
  const totalUsd = parts.reduce((sum, p) => sum + p.totalUsd, 0);

  resultAmount.textContent = totalJpy.toLocaleString('ja-JP');
  resultNote.textContent = `${parts.map((p) => p.name).join(' + ')} を併用した場合の合計`;
  resultSub.textContent = `動画${videos}本×${seconds}秒(Midjourneyのみ候補${candidates}枚+Animate)・為替${rate}円/ドル(合計 $${totalUsd.toFixed(2)})`;
  resultAdvice.textContent = 'それぞれのツールの詳しい前提は下の内訳をご確認ください。同じ動画を複数ツールで作る想定のほか、工程を分担する場合(静止画はA、仕上げはBなど)の合計目安としてもご利用いただけます。' + bookEquivalentNote(totalJpy);

  resultBreakdown.innerHTML = parts.map((p) => `<div><span>${p.name}</span><span>¥${p.totalJpy.toLocaleString('ja-JP')}</span></div>`).join('')
    + `<div><span>合計</span><span>¥${totalJpy.toLocaleString('ja-JP')}</span></div>`;
  resultBreakdown.classList.add('show');

  resultCard.classList.add('show');
  lastTotalJpy = totalJpy;
  shareRow.classList.add('show');

  affCard.href = affiliateUrl('外付けSSD');
  affCard.classList.add('show');
  showProducts('外付けSSD', '動画ファイルの保存に人気のアイテム');

  updateShareUrl();
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc-combo').addEventListener('click', calcCombo);

comboRows.forEach((row) => {
  const checkbox = document.getElementById(row.checkboxId);
  const select = document.getElementById(row.selectId);
  checkbox.addEventListener('change', () => {
    select.disabled = !checkbox.checked;
    document.getElementById(`combo-row-${row.key}`).classList.toggle('active', checkbox.checked);
  });
});

// ---- 上位モード切り替え(単体 / 併用) ----

let topMode = 'single';
const topTabButtons = document.querySelectorAll('.top-mode-tab');
const panelSingle = document.getElementById('panel-single');
const panelCombo = document.getElementById('panel-combo');

topTabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    topMode = btn.dataset.topmode;
    topTabButtons.forEach((b) => b.classList.toggle('active', b === btn));
    panelSingle.style.display = topMode === 'single' ? '' : 'none';
    panelCombo.style.display = topMode === 'combo' ? '' : 'none';
    resultCard.classList.remove('show');
    shareRow.classList.remove('show');
    affCard.classList.remove('show');
    document.getElementById('product-grid').classList.remove('show');
  });
});

// ---- 共有・URL連携 ----

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('topmode', topMode);
  if (topMode === 'single') {
    params.set('tool', selectTool.value);
    params.set('rate', inputRate.value);
    params.set('mj_plan', selectMjPlan.value);
    params.set('mj_videos', inputMjVideos.value);
    params.set('mj_candidates', inputMjCandidates.value);
    params.set('rw_plan', selectRwPlan.value);
    params.set('rw_model', selectRwModel.value);
    params.set('rw_videos', inputRwVideos.value);
    params.set('rw_seconds', inputRwSeconds.value);
    params.set('c5s_plan', selectCredit5sPlan.value);
    params.set('c5s_videos', inputC5sVideos.value);
    params.set('c5s_seconds', inputC5sSeconds.value);
  } else {
    params.set('combo_videos', inputComboVideos.value);
    params.set('combo_seconds', inputComboSeconds.value);
    params.set('combo_candidates', inputComboCandidates.value);
    params.set('combo_rate', inputComboRate.value);
    const checked = comboRows.filter((row) => document.getElementById(row.checkboxId).checked);
    const tools = checked.map((row) => `${row.key}:${document.getElementById(row.selectId).value}`).join(',');
    params.set('combo_tools', tools);
  }
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(amount) {
  return `動画作成AIツールの月額料金を試算しました。\n月額目安:¥${amount.toLocaleString('ja-JP')}\n`;
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
  const text = shareText(lastTotalJpy);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

function initFromQuery() {
  refreshToolFields();
  const params = new URLSearchParams(location.search);
  const tm = params.get('topmode');
  if (tm === 'combo') {
    document.querySelector('.top-mode-tab[data-topmode="combo"]').click();
    const comboVideos = params.get('combo_videos');
    if (comboVideos) inputComboVideos.value = comboVideos;
    const comboSeconds = params.get('combo_seconds');
    if (comboSeconds) inputComboSeconds.value = comboSeconds;
    const comboCandidates = params.get('combo_candidates');
    if (comboCandidates) inputComboCandidates.value = comboCandidates;
    const comboRate = params.get('combo_rate');
    if (comboRate) inputComboRate.value = comboRate;
    const comboTools = params.get('combo_tools');
    if (comboTools) {
      comboTools.split(',').forEach((entry) => {
        const [key, planValue] = entry.split(':');
        const row = comboRows.find((r) => r.key === key);
        if (!row) return;
        const checkbox = document.getElementById(row.checkboxId);
        const select = document.getElementById(row.selectId);
        checkbox.checked = true;
        select.disabled = false;
        if (planValue) select.value = planValue;
        document.getElementById(`combo-row-${row.key}`).classList.add('active');
      });
      calcCombo();
    }
    return;
  }
  const tool = params.get('tool');
  if (tool && TOOL_INFO[tool]) { selectTool.value = tool; refreshToolFields(); }
  const rate = params.get('rate');
  if (rate) inputRate.value = rate;
  const mjPlan = params.get('mj_plan');
  if (mjPlan && MJ_PLANS[mjPlan]) selectMjPlan.value = mjPlan;
  const mjVideos = params.get('mj_videos');
  if (mjVideos) inputMjVideos.value = mjVideos;
  const mjCandidates = params.get('mj_candidates');
  if (mjCandidates) inputMjCandidates.value = mjCandidates;
  const rwPlan = params.get('rw_plan');
  if (rwPlan && RW_PLANS[rwPlan]) selectRwPlan.value = rwPlan;
  const rwModel = params.get('rw_model');
  if (rwModel && RW_MODELS[rwModel]) selectRwModel.value = rwModel;
  const rwVideos = params.get('rw_videos');
  if (rwVideos) inputRwVideos.value = rwVideos;
  const rwSeconds = params.get('rw_seconds');
  if (rwSeconds) inputRwSeconds.value = rwSeconds;
  const c5sPlan = params.get('c5s_plan');
  if (c5sPlan) selectCredit5sPlan.value = c5sPlan;
  const c5sVideos = params.get('c5s_videos');
  if (c5sVideos) inputC5sVideos.value = c5sVideos;
  const c5sSeconds = params.get('c5s_seconds');
  if (c5sSeconds) inputC5sSeconds.value = c5sSeconds;
  if (params.has('tool')) calcSingle();
}

initFromQuery();
