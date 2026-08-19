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

// ---- ジャンル別データ(2026-08-15、Midjourney価格はdouga-ryokinの試算データと同一出典) ----
const GENRES = {
  'line-stamp': {
    label: 'LINEスタンプ制作', toolLow: 0, toolHigh: 4800,
    note: '画像生成AI(Midjourney等)を使います。無料ツールでの試作も可能ですが、キャラクターの一貫性を保つには有料プラン(目安$10〜$30/月)が現実的です。',
    link: { href: '../line-stamp-kankyo/', label: 'LINEスタンプ制作の確認環境' },
  },
  ehon: {
    label: 'Kindle出版(絵本)', toolLow: 0, toolHigh: 4800,
    note: '挿絵用の画像生成AI(Midjourney等)を使います。費用感はLINEスタンプ制作とほぼ同じ水準です。',
    link: { href: '../hajimekata/', label: 'AI副業の始め方' },
  },
  note: {
    label: 'note記事執筆', toolLow: 0, toolHigh: 3000,
    note: '文章の下書き・壁打ちは無料プランのAIチャットで足りることが多く、4ジャンルの中で最も始めやすい費用感です。',
    link: { href: '../hajimekata/', label: 'AI副業の始め方' },
  },
  webapp: {
    label: 'Webアプリ制作', toolLow: 0, toolHigh: 3000,
    note: 'AIにコードを書かせるツールは無料枠から始められることが多く、このサイト自体もこの方法で作られています。',
    link: { href: '../hajimekata/', label: 'AI副業の始め方' },
  },
};

const PC_OPTIONS = {
  already: { label: '十分なPCを持っている', low: 0, high: 0, note: '今のPCでそのまま始められます。' },
  unsure: {
    label: 'PCはあるが力不足かもしれない', low: 0, high: 100000,
    note: 'まずは今のPCで様子を見て、重いと感じてから8万〜10万円台のモデル(メモリ16GB・Core i5/Ryzen 5以上が目安)への買い替えを検討しても遅くありません。',
  },
  none: {
    label: 'パソコンを持っていない', low: 50000, high: 100000,
    note: 'ネット閲覧・文書作成・画像生成AIのWeb版利用が中心なら、5万〜10万円台のノートPC(メモリ16GB・Core i5/Ryzen 5以上目安)が目安です。',
  },
};

// ノートPC25W・1日2時間・月20日・単価31円/kWhで試算(denki-daiと同じ前提値)。25*2*20/1000*31=31円。
const ELEC_MONTHLY = 31;

const selectGenre = document.getElementById('select-genre');
const selectPc = document.getElementById('select-pc');
const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');
const affCard = document.getElementById('aff-card');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
let lastTotalLow = 0;
let lastTotalHigh = 0;

function calc() {
  const genreKey = selectGenre.value;
  const pcKey = selectPc.value;
  const genre = GENRES[genreKey];
  const pc = PC_OPTIONS[pcKey];

  const initLow = pc.low;
  const initHigh = pc.high;
  const monthlyLow = genre.toolLow + ELEC_MONTHLY;
  const monthlyHigh = genre.toolHigh + ELEC_MONTHLY;
  const totalLow = initLow + monthlyLow * 3;
  const totalHigh = initHigh + monthlyHigh * 3;

  resultAmount.textContent = `¥${totalLow.toLocaleString('ja-JP')}〜¥${totalHigh.toLocaleString('ja-JP')}`;
  resultNote.textContent = `${genre.label}・${pc.label}の場合`;
  resultSub.textContent = `内訳:初期費用 ¥${initLow.toLocaleString('ja-JP')}〜¥${initHigh.toLocaleString('ja-JP')} / 月々の目安(ツール+電気代) ¥${monthlyLow.toLocaleString('ja-JP')}〜¥${monthlyHigh.toLocaleString('ja-JP')} ×3ヶ月`;

  const linkHtml = genre.link ? ` くわしくは<a href="${genre.link.href}">${genre.link.label}</a>もあわせてご覧ください。` : '';
  resultAdvice.innerHTML = `${genre.note} ${pc.note}${linkHtml}`;

  resultCard.classList.add('show');
  lastTotalLow = totalLow;
  lastTotalHigh = totalHigh;
  updateShareUrl();
  shareRow.classList.add('show');

  if (pcKey === 'already') {
    affCard.classList.remove('show');
    document.getElementById('product-grid').classList.remove('show');
  } else {
    affCard.href = affiliateUrl('ノートパソコン');
    affCard.classList.add('show');
    showProducts('ノートパソコン', 'これから買うなら人気のノートPC');
  }

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('genre', selectGenre.value);
  params.set('pc', selectPc.value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(low, high) {
  return `AI副業を始める初期費用を試算しました。\n最初の3ヶ月の目安:¥${low.toLocaleString('ja-JP')}〜¥${high.toLocaleString('ja-JP')}\n`;
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
  const text = shareText(lastTotalLow, lastTotalHigh);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const genre = params.get('genre');
  const pc = params.get('pc');
  let matched = false;
  if (genre && GENRES[genre]) { selectGenre.value = genre; matched = true; }
  if (pc && PC_OPTIONS[pc]) { selectPc.value = pc; matched = true; }
  if (matched) calc();
}

initFromQuery();
