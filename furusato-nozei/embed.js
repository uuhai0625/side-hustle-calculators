// 埋め込みウィジェット版(2026-09-10追加)。
// 楽天APIキー(script.js側のRAKUTEN_APP_ID等)は第三者サイトに埋め込まれる前提のこのファイルには
// 一切含めない——埋め込み先が増えるほどキー露出範囲が広がるため、返礼品カード・アフィリエイト
// リンクは埋め込み版では扱わず、計算機能だけを提供する。
//
// 注意: 以下の計算ロジック(salaryDeduction〜calcResult)はscript.js側の実装を複製したもの。
// 税制改正等でscript.js側の計算式を直すときは、このファイルも必ず同じ内容に合わせること。

// --- 給与所得控除(令和7年度税制改正後の速算表、令和7年分以後恒久適用) ---
function salaryDeduction(income) {
  if (income <= 1900000) return 650000;
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
const resultClampNotice = document.getElementById('result-clamp-notice');

// script.js側と同じ上限クランプ(2026-09-12追加、同期維持ルール[[project_furusato_calc_site]]No.10参照)。
const MAX_INCOME_INPUT = 100000000;

function readInput() {
  return {
    salary: Math.min(MAX_INCOME_INPUT, Math.max(0, Number(inputSalary.value) || 0)),
    hasSpouse: selectSpouse.value === '1',
    dependents: Math.min(10, Math.max(0, Number(inputDependents.value) || 0)),
    sideIncome: Math.min(MAX_INCOME_INPUT, Math.max(0, Number(inputSideIncome.value) || 0)),
    sideExpense: Math.min(MAX_INCOME_INPUT, Math.max(0, Number(inputSideExpense.value) || 0)),
    sideType: selectSideType.value,
  };
}

function calc() {
  if (typeof gtag === 'function') {
    gtag('event', 'calc_click', { page_path: location.pathname, embed: true });
  }
  const input = readInput();
  const r = calcResult(input);

  resultAmount.textContent = r.limit.toLocaleString('ja-JP');
  resultNote.textContent = `給与所得¥${Math.round(r.salaryIncome).toLocaleString('ja-JP')} + 副業所得¥${Math.round(r.sideTaxableIncome).toLocaleString('ja-JP')}(${SIDE_TYPE_LABEL[input.sideType]}) = 総所得金額¥${Math.round(r.totalIncome).toLocaleString('ja-JP')}`;

  let notices = [];
  if (r.needsFinalReturn) {
    notices.push('副業所得が年20万円を超えているため、原則として確定申告が必要になり、ワンストップ特例制度は利用できません。');
  }
  if (r.blueAbsorbed) {
    notices.push('副業の利益が青色申告特別控除額の範囲内に収まっているため、総所得金額への算入額は0円です。');
  }
  if (r.outOfScope) {
    notices.push('総所得金額が2,400万円を超えており、この計算機が想定する範囲外です。');
  }
  if (notices.length) {
    resultClampNotice.textContent = `※ ${notices.join(' ')}`;
    resultClampNotice.classList.add('show');
  } else {
    resultClampNotice.classList.remove('show');
  }

  resultCard.classList.add('show');
}

document.getElementById('btn-calc').addEventListener('click', calc);
