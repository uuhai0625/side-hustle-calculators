// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(相場ノートと同一、2026-08-11登録・取得済み)。
const RAKUTEN_AFFILIATE_ID = '567f9cc6.631b3687.567f9cc7.3d3a8a85';

function affiliateUrl(keyword) {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/?s=5`;
  if (!RAKUTEN_AFFILIATE_ID) return searchUrl;
  const encoded = encodeURIComponent(searchUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9`;
}

// 楽天商品検索API(相場ノートと同一設定・新エンドポイント20220601版)。
const RAKUTEN_APP_ID = 'f9f8dd97-c7a4-4ae1-a2c1-38b4572a702e';
const RAKUTEN_ACCESS_KEY = 'pk_gJd3Q0JkttKeBF4DcfYjD8zYljezjxNxEFiUssXZhFs';
const RAKUTEN_API_AFFILIATE_ID = '567fd2ff.507b4e2c.567fd300.5261c56d';

let productRequestId = 0;

// ワットチェッカーは価格が計算結果の金額と連動しないため、goshugi-kodenと同じ単純な人気順4件表示を採用。
async function showProducts(keyword, labelText) {
  const grid = document.getElementById('product-grid');
  const label = document.getElementById('product-grid-label');
  if (!grid) return;
  const requestId = ++productRequestId;
  grid.innerHTML = '';
  grid.classList.remove('show');
  if (label) label.style.display = 'none';
  const url = new URL('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401');
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

// 収益文脈の参考値(2026-08-15追加): Kindle絵本(¥480・KDP70%印税想定)の印税目安¥336/冊。
// 配信コスト控除前の概算のため、実際の手取りはこれよりわずかに少ない。孤立した金額に意味を持たせる目的で追加。
function bookEquivalentNote(monthlyCost) {
  const perBook = 480 * 0.7;
  if (monthlyCost < perBook) return '';
  const books = Math.round(monthlyCost / perBook);
  return ` 参考までに、Kindle絵本1冊(¥480・70%印税想定、配信コスト控除前の概算)に換算すると、月あたり約${books}冊分の売上に相当します。`;
}

// 消費電力の目安(W)。ドスパラ・ENEOSでんき等の公表資料をもとに設定(2026-08-15確認、index.htmlの早見表と同じ出典)。
const DEVICES = {
  laptop:         { label: 'ノートPC', watt: 25 },
  desktop:        { label: 'デスクトップPC(標準・オフィス用途)', watt: 100 },
  desktop_gpu:    { label: 'デスクトップPC(高性能・画像生成AI/動画編集用)', watt: 400 },
  desktop_gaming: { label: 'デスクトップPC(ハイエンドゲーミング)', watt: 600 },
};
const MONITOR_WATT = 35;

const selectDevice = document.getElementById('select-device');
const selectMonitors = document.getElementById('select-monitors');
const inputHours = document.getElementById('input-hours');
const inputDays = document.getElementById('input-days');
const inputPrice = document.getElementById('input-price');
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

function calc() {
  const device = DEVICES[selectDevice.value];
  const monitors = Number(selectMonitors.value);
  // HTMLのmin/max属性はフォーム送信を介さない直接入力・クエリパラメータ経由の値を弾かないため、
  // 計算時に必ずここでも同じ範囲(1日24時間・1ヶ月31日・単価100円/kWh)にクランプする
  // (2026-08-15デバッグで発覚: 999999を入れると704,997,885,002,115,100円のような非現実的な金額が
  // そのまま表示されてしまうバグがあった)。
  const hours = Math.min(24, Math.max(0, Number(inputHours.value) || 0));
  const days = Math.min(31, Math.max(0, Number(inputDays.value) || 0));
  const price = Math.min(100, Math.max(0, Number(inputPrice.value) || 0));

  const totalWatt = device.watt + monitors * MONITOR_WATT;
  const dailyKwh = (totalWatt * hours) / 1000;
  const monthlyKwh = dailyKwh * days;
  const monthlyCost = Math.round(monthlyKwh * price);
  const yearlyCost = monthlyCost * 12;

  resultAmount.textContent = monthlyCost.toLocaleString('ja-JP');
  resultNote.textContent = `${device.label}${monitors > 0 ? `+モニター${monitors}台` : ''}、1日${hours}時間×月${days}日で試算`;
  resultSub.textContent = `年間換算:約¥${yearlyCost.toLocaleString('ja-JP')}(消費電力の目安:合計${totalWatt}W)`;

  let advice = 'この金額はパソコン・モニターのみの目安です。ディスプレイ以外の照明・空調などは含みません。';
  if (device.watt >= 400) {
    advice += ' 高性能デスクトップは負荷の高い作業で瞬間的に消費電力が上がるため、実際の電気代はこれより高くなることがあります。';
  }
  advice += ' 在宅ワーク分を経費計上したい場合は、下の「副業の経費按分計算機」で按分額の目安を確認できます。';
  advice += bookEquivalentNote(monthlyCost);
  resultAdvice.textContent = advice;

  resultCard.classList.add('show');
  lastMonthly = monthlyCost;
  updateShareUrl();
  shareRow.classList.add('show');

  affCard.href = affiliateUrl('ワットチェッカー');
  affCard.classList.add('show');
  showProducts('ワットチェッカー', '電気代を正確に知るための人気アイテム');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('device', selectDevice.value);
  params.set('monitors', selectMonitors.value);
  params.set('hours', inputHours.value);
  params.set('days', inputDays.value);
  params.set('price', inputPrice.value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(amount) {
  return `在宅ワークのパソコン電気代を計算しました。\n月間目安:¥${amount.toLocaleString('ja-JP')}\n`;
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
  const text = shareText(lastMonthly);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const device = params.get('device');
  if (!device || !DEVICES[device]) return;
  selectDevice.value = device;
  const monitors = params.get('monitors');
  if (monitors && ['0', '1', '2', '3'].includes(monitors)) selectMonitors.value = monitors;
  const hours = params.get('hours');
  if (hours) inputHours.value = hours;
  const days = params.get('days');
  if (days) inputDays.value = days;
  const price = params.get('price');
  if (price) inputPrice.value = price;
  calc();
}

initFromQuery();
