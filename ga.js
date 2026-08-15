// GA4計測: GA4プロパティ未作成のため現時点では空文字(診断ツール群・相場ノートと同じ空文字ガードパターン)。
// プロパティ作成後、測定IDをここに設定する。
const GA_MEASUREMENT_ID = '';
if (GA_MEASUREMENT_ID) {
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(gaScript);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}
