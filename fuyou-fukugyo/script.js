// 扶養内の副業計算機(2026-11-24、パート・主婦(主夫)・学生の入口)。給与(パート・アルバイト)とAI副業の売上・経費から、
// ①家族の税金の扶養(配偶者控除・扶養控除・特定親族特別控除)②本人の所得税・住民税 ③健康保険の扶養(130万円など)を判定する。
// 値は令和8年分(2026年分)。根拠: 国税庁「令和8年分 年末調整のしかた」改正点、タックスアンサーNo.1195・1177・1175、日本年金機構(2025-08-19・2026-05-01)。
// 給与所得控除・所得税の基礎控除・速算表はfukugyo-zeikin/script.jsと同じ。2027年1月にNo.107で見直す。

// 給与所得控除(令和8・9年分は220万円以下なら74万円の扱い)。
function salaryDeduction(income) {
  if (income <= 2200000) return 740000;
  if (income <= 3600000) return income * 0.3 + 80000;
  if (income <= 6600000) return income * 0.2 + 440000;
  if (income <= 8500000) return income * 0.1 + 1100000;
  return 1950000;
}

// 所得税の基礎控除(令和8・9年分)。扶養内の人は489万円以下なので104万円。
function incomeTaxBasicDeduction(totalIncome) {
  if (totalIncome <= 4890000) return 1040000;
  if (totalIncome <= 6550000) return 670000;
  return 620000;
}

// 所得税の速算表(1,000円未満切り捨て)+復興特別所得税2.1%。扶養内の所得帯なので330万円の段までで足りる。
function incomeTax(taxable) {
  const t = Math.floor(Math.max(0, taxable) / 1000) * 1000;
  const rows = [[1950000, 0.05, 0], [3300000, 0.10, 97500], [6950000, 0.20, 427500], [Infinity, 0.23, 636000]];
  const [, rate, sub] = rows.find(([max]) => t <= max);
  return Math.floor(Math.max(0, t * rate - sub) * 1021 / 1000); // 浮動小数点の端数で1円ずれないよう整数で計算
}

// 配偶者特別控除(納税者本人の合計所得900万円以下の場合、No.1195の令和8年分以後の表)。
const SPOUSE_SPECIAL = [
  [950000, 380000], [1000000, 360000], [1050000, 310000], [1100000, 260000], [1150000, 210000],
  [1200000, 160000], [1250000, 110000], [1300000, 60000], [1330000, 30000],
];
// 特定親族特別控除(19〜22歳、No.1177の令和8年分以後の表)。
const TOKUTEI_SPECIAL = [
  [850000, 630000], [900000, 610000], [950000, 510000], [1000000, 410000], [1050000, 310000],
  [1100000, 210000], [1150000, 110000], [1200000, 60000], [1230000, 30000],
];
const LINE_DEPENDENT = 620000; // 配偶者控除・扶養控除の所得要件(令和8年分〜、改正前58万円)
const LINE_KINRO = 890000; // 勤労学生控除の所得要件(改正前85万円)
const LINE_RESIDENT = 450000; // 住民税が非課税になる目安(東京23区など、扶養のいない単身)

function lookup(table, income) {
  const row = table.find(([max]) => income <= max);
  return row ? row[1] : 0;
}

const WHO = {
  spouse: '配偶者(夫・妻)の扶養',
  student: '親の扶養(19〜22歳)',
  other: '親などの扶養(16〜18歳・23歳以上など)',
};

// 家族の税金の控除(家族が受ける控除額と、満額が減り始める所得の線)。
function familyDeduction(who, total) {
  if (who === 'spouse') {
    if (total <= LINE_DEPENDENT) return { amount: 380000, name: '配偶者控除', fullLine: 950000, endLine: 1330000 };
    return { amount: lookup(SPOUSE_SPECIAL, total), name: '配偶者特別控除', fullLine: 950000, endLine: 1330000 };
  }
  if (who === 'student') {
    if (total <= LINE_DEPENDENT) return { amount: 630000, name: '扶養控除(特定扶養親族)', fullLine: 850000, endLine: 1230000 };
    return { amount: lookup(TOKUTEI_SPECIAL, total), name: '特定親族特別控除', fullLine: 850000, endLine: 1230000 };
  }
  return { amount: total <= LINE_DEPENDENT ? 380000 : 0, name: '扶養控除', fullLine: LINE_DEPENDENT, endLine: LINE_DEPENDENT };
}

function healthLimit(who, senior) {
  if (senior) return 1800000;
  if (who === 'student') return 1500000;
  return 1300000;
}

function calcResult(input) {
  const salaryIncome = input.salary > 0 ? Math.max(0, input.salary - salaryDeduction(input.salary)) : 0;
  const sideProfit = input.sideIncome - input.sideExpense;
  const sideForTotal = Math.max(0, sideProfit); // 雑所得の赤字は給与と差し引けないので0として扱う
  const total = salaryIncome + sideForTotal;

  const fam = familyDeduction(input.who, total);
  // 勤労学生控除は「勤労によらない所得が10万円以下」も条件。AI副業の所得が当たるか分からないので、副業の所得が10万円以下のときだけ当てる。
  const kinroPossible = input.who === 'student' && total <= LINE_KINRO;
  const kinro = kinroPossible && sideForTotal <= 100000;
  const taxable = total - incomeTaxBasicDeduction(total) - (kinro ? 270000 : 0);
  const ownIncomeTax = incomeTax(taxable);
  const residentFree = total <= LINE_RESIDENT;
  // 所得割10%から調整控除(人的控除の差5万円×5%を上限)を引く。
  const residentBase = Math.floor(Math.max(0, total - 430000 - (kinro ? 260000 : 0)) / 1000) * 1000;
  const ownResident = residentFree ? 0 : Math.max(0, residentBase * 0.1 - Math.min(50000, residentBase) * 0.05);

  const limit = healthLimit(input.who, input.senior);
  // 健康保険の収入には、税金では非課税の通勤手当も入る。
  const healthBySales = input.salary + input.commute + Math.max(0, input.sideIncome);
  const healthByProfit = input.salary + input.commute + sideForTotal;

  // 副業の売上をあと増やせる目安(経費は今のまま): 家族の控除が満額のままの線と、健康保険(売上で数える健保)の線の低いほう。
  // 赤字のときは、赤字を埋めるまで所得が増えないので、その分を足す。
  const taxRoom = fam.fullLine - total + Math.max(0, -sideProfit);
  const healthRoom = limit - 1 - healthBySales;
  return {
    salaryIncome, sideProfit, total, fam, kinro, kinroPossible, outOfRange: total > 4890000, taxable, ownIncomeTax, residentFree, ownResident,
    limit, healthBySales, healthByProfit, taxRoom, healthRoom, rawRoom: Math.min(taxRoom, healthRoom),
    room: Math.floor(Math.max(0, Math.min(taxRoom, healthRoom)) / 1000) * 1000, // 1,000円単位に切り捨て
  };
}

const selectWho = document.getElementById('select-who');
const inputSalary = document.getElementById('input-salary');
const inputSideIncome = document.getElementById('input-side-income');
const inputSideExpense = document.getElementById('input-side-expense');
const inputCommute = document.getElementById('input-commute');
const checkSenior = document.getElementById('check-senior');

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultNote = document.getElementById('result-note');
const resultJudge = document.getElementById('result-judge');
const resultSub = document.getElementById('result-sub');
const resultAdvice = document.getElementById('result-advice');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');

function money(v) {
  return Math.round(v).toLocaleString('ja-JP');
}

// 全角数字・「円」・カンマ・「万」を受け付ける。空欄は0、数字でなければNaN。
let overMax = false;
function readMoney(el) {
  let s = String(el.value).normalize('NFKC').replace(/[,\s円¥￥]/g, '');
  if (s === '') return 0;
  let mul = 1;
  if (s.endsWith('万')) { mul = 10000; s = s.slice(0, -1); }
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  let v = Math.round(Number(s) * mul);
  if (v > 100000000) { overMax = true; v = 100000000; }
  return v;
}

function readInput() {
  overMax = false;
  return {
    who: Object.prototype.hasOwnProperty.call(WHO, selectWho.value) ? selectWho.value : 'spouse',
    salary: readMoney(inputSalary),
    sideIncome: readMoney(inputSideIncome),
    sideExpense: readMoney(inputSideExpense),
    commute: readMoney(inputCommute),
    senior: checkSenior.checked,
  };
}

function judgeItem(label, value) {
  const li = document.createElement('li');
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  li.append(strong, value);
  return li;
}

function computeAndRender() {
  const input = readInput();
  resultJudge.replaceChildren();
  const clear = (msg) => {
    resultAmount.textContent = '--';
    resultNote.textContent = msg;
    resultSub.textContent = '';
    resultAdvice.textContent = '';
    updateShareUrl();
  };
  if ([input.salary, input.sideIncome, input.sideExpense, input.commute].some(Number.isNaN)) {
    clear('金額は数字で入力してください(例: 1000000 や 100万)。');
    return;
  }
  if (input.salary <= 0 && input.sideIncome <= 0) { clear('パート・アルバイトの給与か、副業の売上(見込みでも可)を入力してください。'); return; }

  const r = calcResult(input);
  resultAmount.textContent = money(r.room);
  let note = `合計所得 ¥${money(r.total)}(給与所得 ¥${money(r.salaryIncome)} + 副業の所得 ¥${money(Math.max(0, r.sideProfit))})・${WHO[input.who]}`;
  if (r.sideProfit < 0) note += '。副業は赤字のため0円として計算';
  if (overMax) note += '(1億円を超える入力は1億円として計算)';
  resultNote.textContent = note;

  // ①家族の税金の扶養
  let famText;
  if (input.who === 'other') {
    famText = r.total <= LINE_DEPENDENT
      ? `入っています(合計所得62万円以下)。家族は扶養控除38万円を受けられます(16歳以上の場合。70歳以上は48万円、同居なら58万円)`
      : '外れます(合計所得が62万円を超えています)。家族の扶養控除がなくなります';
  } else if (r.fam.amount === 0) {
    famText = `外れます(合計所得が${money(r.fam.endLine / 10000)}万円を超えています)。家族の${input.who === 'spouse' ? '配偶者特別控除' : '特定親族特別控除'}もなくなります`;
  } else if (r.total <= r.fam.fullLine) {
    famText = `家族の控除は満額です(${r.fam.name} ${money(r.fam.amount / 10000)}万円)`;
  } else {
    const full = input.who === 'spouse' ? 380000 : 630000;
    famText = `家族の控除が減ります(${r.fam.name} ${money(r.fam.amount / 10000)}万円、満額より${money((full - r.fam.amount) / 10000)}万円少ない)`;
  }
  resultJudge.append(judgeItem('家族の税金の扶養(目安)', famText));

  // ②健康保険の扶養
  const limitMan = money(r.limit / 10000);
  let healthText;
  if (r.healthBySales < r.limit) healthText = `収まる見込みです(給与+副業の売上 ¥${money(r.healthBySales)} < ${limitMan}万円)`;
  else if (r.healthByProfit < r.limit) healthText = `健保によって分かれます。売上で数えると${limitMan}万円以上、経費を引くと未満です(給与+副業の売上 ¥${money(r.healthBySales)}、経費を引くと ¥${money(r.healthByProfit)})`;
  else healthText = `外れる可能性が高いです(経費を引いても ¥${money(r.healthByProfit)} で${limitMan}万円以上)`;
  resultJudge.append(judgeItem(`健康保険の扶養(${limitMan}万円の線、目安)`, healthText));

  // ③本人の税金
  resultJudge.append(judgeItem('本人の所得税(目安)', r.outOfRange
    ? 'この計算機の対象外です(扶養内の人向け)。会社員の副業は「副業の税金計算機」で確かめてください'
    : r.ownIncomeTax > 0
    ? `約¥${money(r.ownIncomeTax)}かかります(合計所得が基礎控除104万円${r.kinro ? 'と勤労学生控除27万円' : ''}を超えるため)`
    : `かかりません(合計所得が基礎控除104万円${r.kinro ? 'と勤労学生控除27万円' : ''}の範囲内)`));
  resultJudge.append(judgeItem('本人の住民税(目安)', r.residentFree
    ? 'かからない目安です(合計所得45万円以下。東京23区などで扶養する家族がいない場合)'
    : r.ownResident > 0
      ? `所得割 約¥${money(r.ownResident)}+均等割(年5,000円前後)がかかる目安です`
      : '所得割はかからず、均等割(年5,000円前後)だけがかかる目安です'));

  let filing;
  if (r.sideProfit <= 0) filing = '副業の所得がないので、副業分の申告は不要です';
  else if (input.salary > 0 && r.sideProfit <= 200000) filing = '所得税の確定申告は不要(副業の所得20万円以下)。住民税の申告は市区町村に必要です';
  else if (r.ownIncomeTax > 0) filing = '所得税の確定申告が必要です';
  else filing = '所得税がかからない額なので確定申告の義務はありません。住民税の申告は市区町村に必要です(給与から引かれた所得税がある人は、確定申告をすると戻ることがあります)';
  resultJudge.append(judgeItem('申告(目安)', filing));

  const taxLineName = `家族の控除が満額の線(合計所得${money(r.fam.fullLine / 10000)}万円)`;
  const healthLineName = `健康保険の扶養の線(${limitMan}万円、売上で数える健保の場合)`;
  const firstLine = r.healthRoom < r.taxRoom ? healthLineName : taxLineName;
  let sub;
  if (r.rawRoom < 0) {
    const over = [];
    if (r.taxRoom < 0) over.push(taxLineName);
    if (r.healthRoom < 0) over.push(healthLineName);
    sub = `今の数字で、${over.join('と')}を超えています。`;
  } else if (r.room === 0) {
    sub = `${firstLine}のすぐ手前です。`;
  } else {
    sub = `経費が今のままなら、副業の売上をあと上の金額まで増やしても、${taxLineName}と${healthLineName}を超えない目安です。先に来るのは${firstLine}です。`;
  }
  sub += '入力した数字だけで出した一般的な目安です。家族の会社の家族手当の基準や、加入している健保の数え方は別に確かめてください。';
  resultSub.textContent = sub;

  let advice = '家族の年末調整では、副業の所得も含めた1年分の見積額を書きます。副業の収入があると、健康保険の扶養は、パートの契約上の賃金だけでなく副業も足した1年の見込みで判断されます。1か月の収入が約10.8万円(130万円÷12)を超える月が続くと、年の途中でも確認されることがあるので、加入している健保に確かめてください。';
  if (r.kinroPossible && !r.kinro) advice += '勤労学生控除(27万円)は「勤労によらない所得が10万円以下」も条件のため、副業の所得が10万円を超える今回は入れずに計算しました。AI副業の所得が勤労による所得と認められれば、本人の税金はもっと少なくなります(税務署で確かめてください)。';
  else if (r.kinro) advice += '本人の税金は勤労学生控除(所得税27万円・住民税26万円)を入れて計算しました。学校の在学証明などの条件があります。';
  resultAdvice.textContent = advice;
  updateShareUrl();
}

function calc() {
  computeAndRender();
  resultCard.classList.add('show');
  shareRow.classList.add('show');
  resultCard.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

// 計算ボタンを押した数(calc_click)。共有URLから開いたときの自動計算は数えない。
document.getElementById('btn-calc').addEventListener('click', () => {
  if (typeof gtag === 'function') gtag('event', 'calc_click', { page_path: location.pathname });
  calc();
});

let liveRecalcTimer = null;
function scheduleLiveRecalc() {
  if (!resultCard.classList.contains('show')) return;
  clearTimeout(liveRecalcTimer);
  liveRecalcTimer = setTimeout(computeAndRender, 300);
}
[inputSalary, inputSideIncome, inputSideExpense, inputCommute].forEach((el) => {
  el.addEventListener('input', scheduleLiveRecalc);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('btn-calc').click(); });
});
[selectWho, checkSenior].forEach((el) => el.addEventListener('change', () => {
  if (resultCard.classList.contains('show')) computeAndRender();
}));

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('who', selectWho.value);
  params.set('salary', inputSalary.value);
  params.set('side', inputSideIncome.value);
  params.set('cost', inputSideExpense.value);
  if (inputCommute.value) params.set('commute', inputCommute.value);
  if (checkSenior.checked) params.set('senior', '1');
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  (window.replaceUrlQuietly || history.replaceState.bind(history))(null, '', `${location.pathname}?${params.toString()}`);
}

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
  if (!params.has('salary')) return;
  const who = params.get('who');
  if (who && Object.prototype.hasOwnProperty.call(WHO, who)) selectWho.value = who;
  inputSalary.value = params.get('salary');
  inputSideIncome.value = params.get('side') || '';
  inputSideExpense.value = params.get('cost') || '';
  inputCommute.value = params.get('commute') || '';
  checkSenior.checked = params.get('senior') === '1';
  calc();
}

initFromQuery();
document.documentElement.classList.remove('qshow');
