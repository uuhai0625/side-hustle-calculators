// GA4計測(2026-08-15導入、プロパティ「副業そろばん」)。診断ツール群・相場ノートと同じ空文字ガードパターン。
const GA_MEASUREMENT_ID = 'G-P6QWLBJZJH';
// ローカル開発サーバー(_devserver.ps1)からのアクセスを除外するガード。
// これがないとClaudeの動作確認のたびに本番GA4にダミーのpageview/eventが記録されてしまう
// (2026-08-28のGA4監査で発覚: 同一ページが「/denki-dai/」(ローカル)と「/side-hustle-calculators/denki-dai/」(本番)に
// パスが分裂して計測されていた)。
const isLocalDev = ['localhost', '127.0.0.1', ''].includes(location.hostname);
if (GA_MEASUREMENT_ID && !isLocalDev) {
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(gaScript);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);

  // アフィリエイトリンクのクリック計測(2026-08-28追加: それまでキーイベントが一切設定されておらず
  // 「どのページが実際に楽天へのクリックを生んでいるか」を測る手段がなかった)。
  // 全ページ共通のdocumentレベル委譲なので、product-grid内で動的に生成されるproduct-cardも個別配線不要で拾える。
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.aff-card, .product-card');
    if (!link) return;
    // category/price: furusato-nozeiの返礼品カードのみdata-category/data-price属性を持つ(2026-08-31追加)。
    // 他ページのproduct-cardには存在しないため、そのままundefinedになりイベント自体には影響しない。
    gtag('event', 'affiliate_click', {
      link_type: link.classList.contains('product-card') ? 'product_card' : 'aff_card',
      link_id: link.id || '',
      link_url: link.href || '',
      page_path: location.pathname,
      category: link.dataset.category || undefined,
      price: link.dataset.price || undefined,
    });
  });
}
