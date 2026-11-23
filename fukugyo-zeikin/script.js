// 副業の税金計算機(2026-11-22、迷っている人の入口)。会社員(給与1か所・年末調整あり)の副業所得について、
// 所得税の確定申告が要るか(20万円ルール)、住民税の申告、副業で増える税金と手取りの目安を出す。
// 控除の値はfurusato-nozei/script.jsと同じ令和8年分(2026年分)。社会保険料は給与の15%で概算、配偶者・扶養はなしで計算する。

// 給与所得控除(令和8・9年分は最低74万円)。furusato-nozeiと同じ。
function salaryDeduction(income) {
  if (income <= 2200000) return 740000;
  if (income <= 3600000) return income * 0.3 + 80000;
  if (income <= 6600000) return income * 0.2 + 440000;
  if (income <= 8500000) return income * 0.1 + 1100000;
  return 1950000;
}

// 所得税の基礎控除(令和8・9年分、合計所得金額ベース)。furusato-nozeiと同じ。
// 2,350万円を超える段(48万・32万・16万・0円)は国税庁No.1199の表。
function incomeTaxBasicDeduction(totalIncome) {
  if (totalIncome <= 4890000) return 1040000;
  if (totalIncome <= 6550000) return 670000;
  if (totalIncome <= 23500000) return 620000;
  if (totalIncome <= 24000000) return 480000;
  if (totalIncome <= 24500000) return 320000;
  if (totalIncome <= 25000000) return 160000;
  return 0;
}

// 住民税の基礎控除(2,400万円以下は43万円)。
function residentBasicDeduction(totalIncome) {
  if (totalIncome <= 24000000) return 430000;
  if (totalIncome <= 24500000) return 290000;
  if (totalIncome <= 25000000) return 150000;
  return 0;
}

// 所得税の速算表(課税所得は1,000円未満切り捨て)。復興特別所得税2.1%を上乗せする。
function incomeTax(taxable) {
  const t = Math.floor(Math.max(0, taxable) / 1000) * 1000;
  const rows = [
    [1950000, 0.05, 0], [3300000, 0.10, 97500], [6950000, 0.20, 427500],
    [9000000, 0.23, 636000], [18000000, 0.33, 1536000], [40000000, 0.40, 2796000], [Infinity, 0.45, 4796000],
  ];
  const [, rate, sub] = rows.find(([max]) => t <= max);
  return Math.max(0, t * rate - sub) * 1.021;
}

// 住民税の所得割(10%)。調整控除などの細かい差は省く。
function residentTax(totalIncome, social) {
  if (totalIncome <= 450000) return 0; // 非課税の目安(東京23区など、扶養する家族がいない単身。自治体で違う)
  const t = Math.floor(Math.max(0, totalIncome - social - residentBasicDeduction(totalIncome)) / 1000) * 1000;
  return t * 0.10;
}

// 公的年金等控除(年金以外の合計所得1,000万円以下の場合、国税庁No.1600)。65歳以上と65歳未満で最低額が違う。
function pensionDeduction(income, over65) {
  if (income <= (over65 ? 3300000 : 1300000)) return over65 ? 1100000 : 600000;
  if (income <= 4100000) return income * 0.25 + 275000;
  if (income <= 7700000) return income * 0.15 + 685000;
  if (income <= 10000000) return income * 0.05 + 1455000;
  return 1955000;
}

// 本業の立場(2026-11-24、会社員以外にも広げた)。base=入力欄の意味。
const STATUS = {
  kaishain: { label: '会社員・公務員(給与)', base: '本業の給与の年収(額面・円)', hint: '源泉徴収票の「支払金額」。見込みでもかまいません。' },
  jigyo: { label: 'フリーランス・自営業', base: '本業の所得(青色申告特別控除と社会保険料を引いた後、円)', hint: '本業の売上から経費・青色申告特別控除・国民健康保険料や国民年金などを引いた額。見込みでもかまいません。青色申告特別控除は1人1つなので、副業の種類は雑所得か白色で計算します。' },
  nenkin65: { label: '年金を受け取っている(65歳以上)', base: '公的年金の年額(円)', hint: '源泉徴収票(公的年金等)の「支払金額」。65歳以上かどうかは、その年の12月31日時点で判定します。' },
  nenkin: { label: '年金を受け取っている(65歳未満)', base: '公的年金の年額(円)', hint: '源泉徴収票(公的年金等)の「支払金額」。' },
  none: { label: '本業の収入なし(専業・無職など)', base: '本業の所得(なければ0、円)', hint: '本業がなければ0のままで計算します。家族の扶養に入っている方は、扶養内の副業計算機のほうが合っています。' },
};

const SIDE_TYPE_LABEL = {
  zatsu: '雑所得',
  white: '事業所得(白色申告)',
  blue10: '事業所得(青色申告・10万円控除)',
  blue65: '事業所得(青色申告・65万円控除、e-Taxで期限内に申告)',
};

function calcResult(input) {
  const st = input.status;
  let salaryIncome; // 本業の所得(給与所得・事業所得・年金の雑所得)
  if (st === 'kaishain') salaryIncome = Math.max(0, input.salary - salaryDeduction(input.salary));
  else if (st === 'nenkin65' || st === 'nenkin') salaryIncome = Math.max(0, input.salary - pensionDeduction(input.salary, st === 'nenkin65'));
  else salaryIncome = input.salary; // 自営業は所得をそのまま、収入なしは0の想定
  // 社会保険料は会社員だけ給与の15%で概算。それ以外は人によって大きく違うので入れない(増える税金の差にはほぼ効かない)。
  // 入力があればそれを使う(国民年金・国保・介護保険料など。本業0の人には効きが大きい)。
  const social = input.social > 0 ? input.social : (st === 'kaishain' ? input.salary * 0.15 : 0);
  const sideProfit = input.sideIncome - input.sideExpense; // 売上−経費(赤字もそのまま)
  const isBlue = input.sideType === 'blue10' || input.sideType === 'blue65';
  // 青色10万円控除は確定申告をしなくても受けられる。20万円の判定は10万円控除後の所得で行う(国税庁 質疑応答)。
  const under20 = Math.max(0, sideProfit - (isBlue ? 100000 : 0)) <= 200000;
  const pensionExempt = (st === 'nenkin65' || st === 'nenkin') && input.salary <= 4000000 && under20; // 年金の申告不要制度
  let mustFile;
  if (st === 'kaishain') mustFile = !under20 || input.salary > 20000000;
  else if (pensionExempt) mustFile = false;
  else mustFile = null; // 収入なし・年金で申告不要制度に当たらない: 所得税が出るかで決まる(下で判定)
  // 65万円控除は期限内の申告(e-Tax等)が条件。65万円を選んだ人は申告する前提で計算する。
  const blueDeduction = input.sideType === 'blue65' ? 650000 : isBlue ? 100000 : 0;
  const sideIncomeForTax = Math.max(0, sideProfit - blueDeduction);

  const baseIncome = salaryIncome;
  const withIncome = salaryIncome + sideIncomeForTax;
  const itBase = incomeTax(baseIncome - social - incomeTaxBasicDeduction(baseIncome));
  const itWith = incomeTax(withIncome - social - incomeTaxBasicDeduction(withIncome));
  if (mustFile === null) mustFile = itWith > 0;
  const files = mustFile || input.otherFiling || input.sideType === 'blue65';
  // 申告しない場合、20万円以下の副業の所得に所得税はかからない(住民税だけ増える)。
  const incomeTaxUp = files ? Math.max(0, Math.round(itWith - itBase)) : 0;
  const residentUp = Math.max(0, Math.round(residentTax(withIncome, social) - residentTax(baseIncome, social)));
  const taxUp = incomeTaxUp + residentUp;

  return {
    sideProfit, blueDeduction, sideIncomeForTax, under20, mustFile, files, isBlue,
    incomeTaxUp, residentUp, taxUp, pensionExempt, status: st,
    takeHome: Math.max(0, sideProfit) - taxUp,
    loss: sideProfit < 0,
    highSalary: st === 'kaishain' && input.salary > 20000000,
  };
}

const MAX_INPUT = 100000000;
const inputSalary = document.getElementById('input-salary');
const selectStatus = document.getElementById('select-status');
const inputSocial = document.getElementById('input-social');
const labelSalary = document.getElementById('label-salary');
const salaryHint = document.getElementById('salary-hint-text');
function applyStatusLabel() {
  const s = STATUS[selectStatus.value] || STATUS.kaishain;
  labelSalary.textContent = s.base;
  salaryHint.textContent = s.hint;
  // 自営業は本業で青色申告特別控除を使っている前提なので、副業に青色の控除は付けない(1人1つ)。
  const jigyo = selectStatus.value === 'jigyo';
  [...selectSideType.options].forEach((o) => { if (o.value.startsWith('blue')) o.disabled = jigyo; });
  if (jigyo && selectSideType.value.startsWith('blue')) selectSideType.value = 'zatsu';
}
selectStatus.addEventListener('change', () => {
  // 立場が変わると入力欄の意味(給与・所得・年金)が変わるので、前の金額は残さない。
  inputSalary.value = selectStatus.value === 'none' ? '0' : '';
  applyStatusLabel();
  scheduleLiveRecalc();
});
const inputSideIncome = document.getElementById('input-side-income');
const inputSideExpense = document.getElementById('input-side-expense');
const selectSideType = document.getElementById('select-side-type');
const checkOtherFiling = document.getElementById('check-other-filing');

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

// 全角数字・カンマ・「450万」も読む。読めない入力はNaNを返し、黙って0円にしない。
let overMax = false;
function readMoney(el) {
  const raw = String(el.value).normalize('NFKC').replace(/[,\s円¥￥]/g, '');
  if (raw === '') return 0;
  const man = raw.match(/^(\d+(?:\.\d+)?)万$/);
  const n = man ? Number(man[1]) * 10000 : (/^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : NaN);
  if (Number.isNaN(n)) return NaN;
  if (n > MAX_INPUT) overMax = true;
  return Math.min(MAX_INPUT, Math.round(n));
}

function readInput() {
  overMax = false;
  return {
    status: Object.prototype.hasOwnProperty.call(STATUS, selectStatus.value) ? selectStatus.value : 'kaishain',
    salary: readMoney(inputSalary),
    social: readMoney(inputSocial),
    sideIncome: readMoney(inputSideIncome),
    sideExpense: readMoney(inputSideExpense),
    sideType: Object.prototype.hasOwnProperty.call(SIDE_TYPE_LABEL, selectSideType.value) ? selectSideType.value : 'zatsu',
    otherFiling: checkOtherFiling.checked,
  };
}

function judgeItem(label, value) {
  const li = document.createElement('li');
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  li.append(strong, value);
  return li;
}

function signedMoney(v) {
  return v < 0 ? `−¥${money(-v)}` : `¥${money(v)}`;
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
  if ([input.salary, input.sideIncome, input.sideExpense, input.social].some(Number.isNaN)) {
    clear('金額は数字で入力してください(例: 4500000 や 450万)。');
    return;
  }
  if (input.salary <= 0 && input.status !== 'none' && input.status !== 'jigyo') { clear(`${STATUS[input.status].base.replace(/\(.*\)$/, '')}を入力してください。`); return; }
  if (input.sideIncome <= 0 && input.sideExpense <= 0) { clear('副業の1年間の売上(見込みでも可)を入力してください。'); return; }

  const r = calcResult(input);
  resultAmount.textContent = r.takeHome < 0 ? `−${money(-r.takeHome)}` : money(r.takeHome);
  let note = `副業の利益(売上 ¥${money(input.sideIncome)} − 経費 ¥${money(input.sideExpense)}) ${signedMoney(r.sideProfit)}${r.loss ? '(赤字)' : ''}`;
  if (r.blueDeduction && !r.loss) note += `、青色申告特別控除 ¥${money(r.blueDeduction)}を引いた所得 ¥${money(r.sideIncomeForTax)}`;
  note += `・${SIDE_TYPE_LABEL[input.sideType]}`;
  if (overMax) note += '(1億円を超える入力は1億円として計算しています)';
  resultNote.textContent = note;

  let filing;
  if (r.status !== 'kaishain' && input.otherFiling) filing = '必要(医療費控除などで確定申告をするので、副業の所得も含めて申告します)';
  else if (r.status === 'jigyo' && r.mustFile) filing = '必要(本業の確定申告に、副業の所得も合わせて申告します)';
  else if (r.status !== 'kaishain' && r.loss && input.sideType !== 'zatsu') filing = '義務は副業だけでは生じません。ただし赤字を本業の所得と差し引く(税金を戻す)には確定申告が必要です';
  else if (r.status !== 'kaishain' && !r.pensionExempt) {
    filing = r.mustFile
      ? `必要(本業と副業を合わせた所得に所得税がかかるため${r.status === 'none' || r.status === 'jigyo' ? '' : '。年金の申告不要制度(年金400万円以下かつほかの所得20万円以下)にも当たりません'})`
      : '義務はありません(合わせた所得に所得税がかからない目安)。住民税の申告が必要な場合があるので、市区町村で確かめてください';
  } else if (r.pensionExempt && !input.otherFiling) filing = '不要(年金の申告不要制度: 公的年金400万円以下で、副業の所得が20万円以下)。住民税の申告が必要な場合があるので、市区町村で確かめてください';
  else if (r.highSalary) filing = '必要(給与の年収が2,000万円を超える人は、副業の額にかかわらず確定申告が必要です)';
  else if (!r.under20) filing = `必要(副業の所得が20万円を超えています${r.isBlue ? '。青色10万円控除を引いた後で判定' : ''})`;
  else if (input.otherFiling) filing = '必要(医療費控除などで確定申告をするので、20万円以下の副業の所得も含めて申告します)';
  else if (r.loss && input.sideType !== 'zatsu') filing = '義務はありません。ただし赤字を給与と差し引く(税金を戻す)には確定申告が必要です';
  else if (input.sideType === 'blue65') filing = '義務はありません(10万円控除後の所得が20万円以下)。ただし65万円控除を受けるには期限内の申告が必要で、この計算は申告する前提です';
  else filing = '不要(副業の所得が20万円以下で、ほかに確定申告する理由がない場合)';
  resultJudge.append(judgeItem('所得税の確定申告(目安)', filing));
  resultJudge.append(judgeItem('住民税の申告(目安)', r.files
    ? '確定申告をすれば、別の申告は要りません(確定申告の内容が市区町村に送られます)'
    : (r.sideProfit > 0 ? '必要。お住まいの市区町村へ住民税の申告書を出します(期限や出し方は市区町村の案内で確認してください)' : '所得が0円以下なら、申告の要否はお住まいの市区町村で確認してください')));

  let sub = `うち税金 ¥${money(r.taxUp)}(所得税 ¥${money(r.incomeTaxUp)} + 住民税 ¥${money(r.residentUp)})。`;
  if (r.loss) {
    sub = input.sideType === 'zatsu'
      ? '副業が赤字です。雑所得の赤字は給与と差し引きできないので、税金は増えも減りもしません。'
      : `副業が赤字です。事業所得の赤字は、確定申告で${input.status === 'kaishain' ? '給与' : '本業の所得'}と差し引ける(税金が戻る)ことがあります。この計算機では戻る額は出していません。`;
  } else if (r.takeHome < 0) {
    sub += '基礎控除が所得の段で一気に減るため、副業の利益より増える税金のほうが多くなっています。';
  }
  sub += '入力した数字だけで出した一般的な目安です。最終的な判断は税務署・市区町村に確認してください。';
  resultSub.textContent = sub;

  let advice;
  if (r.status !== 'kaishain') {
    advice = '国民健康保険料(75歳以上は後期高齢者医療の保険料)は所得に応じて決まるので、副業の所得が増えると上がることがあります。この計算には入っていません。';
    if (r.residentUp > 0 && r.status !== 'jigyo') advice += '住民税が0円からかかるようになると、住民税非課税世帯向けの給付や介護保険料の段階が変わることがあります。市区町村で確かめてください。';
    if (r.status === 'none') advice += '家族の扶養に入っている方は、扶養内の副業計算機で扶養から外れないかも確かめてください。';
    if (r.status === 'jigyo') advice += '同じ事業の延長なら、本業と副業を分けず1つの事業所得にまとめることもあります。';
    resultAdvice.textContent = advice;
    updateShareUrl();
    return;
  }
  if (r.taxUp <= 0) {
    advice = '副業で住民税は増えないため、会社の天引き額は変わりません。';
  } else {
    advice = '住民税を給料から天引き(特別徴収)にしていると、副業分の住民税も会社の天引き額に加わり、増えた額から副業に気づかれることがあります。';
    advice += r.files
      ? '確定申告書の第二表「住民税・事業税に関する事項」で「自分で納付」を選ぶと、副業分を自分で納める形にできる場合があります(申告の内容によっては天引きになり、扱いは市区町村によります)。'
      : '住民税の申告書で、副業分を自分で納める(普通徴収)と希望できる場合があります(扱いは市区町村によります)。';
  }
  advice += 'いちばん確実なのは、先に会社の就業規則で副業が認められているかを確かめることです。';
  resultAdvice.textContent = advice;
  updateShareUrl();
}

function calc() {
  computeAndRender();
  resultCard.classList.add('show');
  shareRow.classList.add('show');
  resultCard.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

// 計算ボタンを押した数(calc_click、2026-11-22)。迷っている人が計算まで進んだかを判定日に見る。
// 共有URLから開いたときの自動計算は数えない。ローカル環境ではgtagがないので存在チェックする。
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
[inputSalary, inputSideIncome, inputSideExpense, inputSocial].forEach((el) => {
  el.addEventListener('input', scheduleLiveRecalc);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('btn-calc').click(); });
});
[selectSideType, checkOtherFiling].forEach((el) => el.addEventListener('change', scheduleLiveRecalc));

function paramsFromState() {
  const params = new URLSearchParams();
  if (selectStatus.value !== 'kaishain') params.set('status', selectStatus.value);
  params.set('salary', inputSalary.value);
  if (inputSocial.value) params.set('social', inputSocial.value);
  params.set('side', inputSideIncome.value);
  params.set('cost', inputSideExpense.value);
  params.set('type', selectSideType.value);
  if (checkOtherFiling.checked) params.set('other', '1');
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
  const status = params.get('status');
  if (status && Object.prototype.hasOwnProperty.call(STATUS, status)) { selectStatus.value = status; applyStatusLabel(); }
  inputSalary.value = params.get('salary');
  inputSocial.value = params.get('social') || '';
  if (params.has('side')) inputSideIncome.value = params.get('side');
  if (params.has('cost')) inputSideExpense.value = params.get('cost');
  const type = params.get('type');
  if (type && Object.prototype.hasOwnProperty.call(SIDE_TYPE_LABEL, type)) selectSideType.value = type;
  checkOtherFiling.checked = params.get('other') === '1';
  calc();
}

initFromQuery();
document.documentElement.classList.remove('qshow');
