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

function cardHtml(item) {
  const imgRaw = item.mediumImageUrls && item.mediumImageUrls[0];
  const img = typeof imgRaw === 'string' ? imgRaw : (imgRaw && imgRaw.imageUrl) || '';
  const price = Number(item.itemPrice).toLocaleString('ja-JP');
  const name = String(item.itemName || '').replace(/</g, '&lt;');
  return `
    <a class="product-card" href="${item.itemUrl}" target="_blank" rel="noopener sponsored">
      <img src="${img}" alt="" loading="lazy">
      <p class="product-name">${name}</p>
      <p class="product-price">¥${price}</p>
    </a>`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Midjourney: Fast GPU時間の割り当て(分換算)と月額(USD)。2026年8月確認の公開プラン。
const MJ_PLANS = {
  basic:    { label: 'Basic($10)', priceUsd: 10, fastMin: 198 },
  standard: { label: 'Standard($30)', priceUsd: 30, fastMin: 900 },
  pro:      { label: 'Pro($60)', priceUsd: 60, fastMin: 1800 },
  mega:     { label: 'Mega($120)', priceUsd: 120, fastMin: 3600 },
};
const MJ_STILL_MIN = 1;      // 静止画1枚あたりのFast時間の目安(分)
const MJ_ANIMATE_MIN = 26;   // 動画化(Animate)1本あたりのFast時間の目安(分)
const MJ_EXTRA_USD_PER_MIN = 4 / 60; // 追加Fast時間は$4/時間

// Runway: プランの月額クレジットと月額(USD)。2026年8月確認の公開プラン。
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

let mode = 'mj';
const tabButtons = document.querySelectorAll('.scene-tab');
const fieldsMj = document.getElementById('fields-mj');
const fieldsRw = document.getElementById('fields-rw');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    tabButtons.forEach((b) => b.classList.toggle('active', b === btn));
    fieldsMj.style.display = mode === 'mj' ? '' : 'none';
    fieldsRw.style.display = mode === 'rw' ? '' : 'none';
  });
});

const inputRate = document.getElementById('input-fx-rate');
const selectMjPlan = document.getElementById('select-mj-plan');
const inputMjVideos = document.getElementById('input-mj-videos');
const inputMjCandidates = document.getElementById('input-mj-candidates');
const selectRwPlan = document.getElementById('select-rw-plan');
const selectRwModel = document.getElementById('select-rw-model');
const inputRwVideos = document.getElementById('input-rw-videos');
const inputRwSeconds = document.getElementById('input-rw-seconds');

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');
const affCard = document.getElementById('aff-card');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
let lastTotalJpy = 0;

function calc() {
  // HTMLのmin/max属性は直接入力・クエリパラメータ経由の値を弾かないため、
  // 計算時に必ずここでも同じ範囲にクランプする(denki-daiの実装と同じ方針)。
  const rate = clamp(Number(inputRate.value) || 159, 100, 300);
  let totalUsd, note, sub, advice;

  if (mode === 'mj') {
    const plan = MJ_PLANS[selectMjPlan.value] || MJ_PLANS.standard;
    const videos = clamp(Math.round(Number(inputMjVideos.value) || 0), 1, 60);
    const candidates = clamp(Math.round(Number(inputMjCandidates.value) || 0), 1, 20);
    const neededMin = videos * (candidates * MJ_STILL_MIN + MJ_ANIMATE_MIN);
    const overMin = Math.max(0, neededMin - plan.fastMin);
    const extraUsd = overMin * MJ_EXTRA_USD_PER_MIN;
    totalUsd = plan.priceUsd + extraUsd;
    note = `Midjourney ${plan.label}、動画${videos}本(候補${candidates}枚+Animate)で試算`;
    sub = `Fast時間の目安:必要${neededMin}分 / プラン付与${plan.fastMin}分・為替${rate}円/ドル`;
    advice = overMin > 0
      ? `プランのFast時間だけでは約${Math.ceil(overMin / 6) / 10}時間分足りない見込みです。追加購入(1時間$4)は割高になりやすいため、必要な追加時間が大きい場合は上位プランへの切り替えも検討してください。`
      : `選んだプランのFast時間の範囲内に収まる見込みです。Fast時間は使い切っても翌月に繰り越されません。`;
  } else {
    const plan = RW_PLANS[selectRwPlan.value] || RW_PLANS.standard;
    const model = RW_MODELS[selectRwModel.value] || RW_MODELS.gen4;
    const videos = clamp(Math.round(Number(inputRwVideos.value) || 0), 1, 60);
    const seconds = clamp(Math.round(Number(inputRwSeconds.value) || 0), 1, 30);
    const neededCredits = videos * seconds * model.creditsPerSec;
    const overCredits = Math.max(0, neededCredits - plan.credits);
    const extraUsd = overCredits * RW_EXTRA_USD_PER_CREDIT;
    totalUsd = plan.priceUsd + extraUsd;
    note = `Runway ${plan.label}、${model.label}で動画${videos}本×${seconds}秒で試算`;
    sub = `クレジットの目安:必要${neededCredits.toLocaleString('ja-JP')} / プラン付与${plan.credits.toLocaleString('ja-JP')}・為替${rate}円/ドル`;
    advice = overCredits > 0
      ? `プランのクレジットだけでは約${overCredits.toLocaleString('ja-JP')}クレジット足りない見込みです。追加クレジットの単価は公開されているAPI従量課金($0.01/credit)を参考値にしています、実際のサブスク追加購入パックの単価はRunwayのアカウント画面でご確認ください。`
      : `選んだプランのクレジットの範囲内に収まる見込みです。モデルを変えると秒あたりの消費クレジットが大きく変わります。`;
  }

  const totalJpy = Math.round(totalUsd * rate);
  resultAmount.textContent = totalJpy.toLocaleString('ja-JP');
  resultNote.textContent = note;
  resultSub.textContent = `${sub}(月額目安 $${totalUsd.toFixed(2)})`;
  resultAdvice.textContent = advice;

  resultCard.classList.add('show');
  lastTotalJpy = totalJpy;
  updateShareUrl();
  shareRow.classList.add('show');

  affCard.href = affiliateUrl('外付けSSD');
  affCard.classList.add('show');
  showProducts('外付けSSD', '動画ファイルの保存に人気のアイテム');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('mode', mode);
  params.set('rate', inputRate.value);
  params.set('mj_plan', selectMjPlan.value);
  params.set('mj_videos', inputMjVideos.value);
  params.set('mj_candidates', inputMjCandidates.value);
  params.set('rw_plan', selectRwPlan.value);
  params.set('rw_model', selectRwModel.value);
  params.set('rw_videos', inputRwVideos.value);
  params.set('rw_seconds', inputRwSeconds.value);
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
  const params = new URLSearchParams(location.search);
  const m = params.get('mode');
  if (m === 'mj' || m === 'rw') {
    mode = m;
    tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    fieldsMj.style.display = m === 'mj' ? '' : 'none';
    fieldsRw.style.display = m === 'rw' ? '' : 'none';
  }
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
  if (params.has('mode')) calc();
}

initFromQuery();
