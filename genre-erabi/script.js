// AI副業のジャンル選び(2026-11-24)。「月の費用を回収するには、1か月にいくつ売れれば(何件受ければ)よいか」を出す。
// 取り分の初期値は各サービスの公式情報(ページ下の参考)。価格の初期値は入力例で、相場ではない。
const GENRES = {}; // genre-erabi/index.htmlの<option>のdata-*から作る(表と計算機で値を二重に持たないため)

const selectGenre = document.getElementById('select-genre');
const inputCost = document.getElementById('input-cost');
const inputPrice = document.getElementById('input-price');
const inputShare = document.getElementById('input-share');

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');

[...selectGenre.options].forEach((o) => {
  GENRES[o.value] = { label: o.textContent, cost: o.dataset.cost, price: o.dataset.price, share: o.dataset.share, unit: o.dataset.unit, note: o.dataset.note || '' };
});

// 自分で書き換えた欄は、ジャンルを変えても残す。
const edited = new Set();
[inputCost, inputPrice, inputShare].forEach((el) => el.addEventListener('input', () => edited.add(el)));
function applyGenre() {
  const g = GENRES[selectGenre.value];
  if (!g) return;
  if (!edited.has(inputCost)) inputCost.value = g.cost;
  if (!edited.has(inputPrice)) inputPrice.value = g.price;
  if (!edited.has(inputShare)) inputShare.value = g.share;
}
selectGenre.addEventListener('change', () => { applyGenre(); if (resultCard.classList.contains('show')) computeAndRender(); });

function readNum(el) {
  let s = String(el.value).normalize('NFKC').replace(/[,\s円¥%]/g, '');
  if (s === '') return 0;
  let mul = 1;
  if (s.endsWith('万')) { mul = 10000; s = s.slice(0, -1); }
  return /^(\d+(\.\d*)?|\.\d+)$/.test(s) ? Number(s) * mul : NaN;
}

function money(v) {
  return Math.round(v).toLocaleString('ja-JP');
}

function computeAndRender() {
  const g = GENRES[selectGenre.value];
  const cost = readNum(inputCost);
  const price = readNum(inputPrice);
  const share = readNum(inputShare);
  if ([cost, price, share].some(Number.isNaN) || share > 100) {
    resultAmount.textContent = '--';
    resultNote.textContent = share > 100 ? '手元に入る割合は100%以下で入力してください。' : '数字で入力してください。';
    resultSub.textContent = '';
    resultAdvice.textContent = '';
    return;
  }
  const perSale = price * share / 100;
  if (perSale < 1) {
    resultAmount.textContent = '--';
    resultNote.textContent = '1つあたり手元に入る額が1円以上になるよう、価格と取り分を入れてください。';
    resultSub.textContent = '';
    resultAdvice.textContent = '';
    return;
  }
  const need = cost <= 0 ? 0 : Math.ceil(cost / perSale);
  resultAmount.textContent = need.toLocaleString('ja-JP');
  const custom = String(g.price) !== String(price) || String(g.share) !== String(share);
  resultNote.textContent = `${g.label}${custom ? '(入力した値で計算)' : ''}: 1${g.unit}あたり手元に約¥${money(perSale)}(価格 ¥${money(price)} × 取り分 ${share}%)、月の費用 ¥${money(cost)}`;
  resultSub.textContent = cost <= 0
    ? '月の費用が0円なので、1つ目から手元に残ります(税金は別)。'
    : `1か月に${need.toLocaleString('ja-JP')}${g.unit}で、AIツール代などの月の費用と同じくらいになります。1年続けると費用は ¥${money(cost * 12)} です。税金や振込手数料は入れていません。`;
  resultAdvice.textContent = custom ? '' : g.note;
}

function calc() {
  computeAndRender();
  resultCard.classList.add('show');
  resultCard.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

document.getElementById('btn-calc').addEventListener('click', () => {
  if (typeof gtag === 'function') gtag('event', 'calc_click', { page_path: location.pathname });
  calc();
});

let timer = null;
[inputCost, inputPrice, inputShare].forEach((el) => {
  el.addEventListener('input', () => {
    if (!resultCard.classList.contains('show')) return;
    clearTimeout(timer);
    timer = setTimeout(computeAndRender, 300);
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('btn-calc').click(); });
});

applyGenre();
