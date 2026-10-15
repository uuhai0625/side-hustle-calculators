// GA4計測(2026-08-15導入、プロパティ「副業そろばん」)。診断ツール群・相場ノートと同じ空文字ガードパターン。
const GA_MEASUREMENT_ID = 'G-P6QWLBJZJH';
// ローカル開発サーバー(_devserver.ps1)からのアクセスを除外するガード。
// これがないとClaudeの動作確認のたびに本番GA4にダミーのpageview/eventが記録されてしまう
// (2026-08-28のGA4監査で発覚: 同一ページが「/denki-dai/」(ローカル)と「/side-hustle-calculators/denki-dai/」(本番)に
// パスが分裂して計測されていた)。
const isLocalDev = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname) || /^(192\.168|10|172\.(1[6-9]|2\d|3[01]))\./.test(location.hostname);
// GA4の拡張計測は history.replaceState を検知して、クエリ付きのURLでpage_viewを送る。計算機は入力のたびに
// 共有用のクエリ(年収など)をURLへ書き込むので、gtagが差し替える前の元の関数を取っておき、URLの書き換えにはこちらを使う
// (入力値がGA4に届くのと、同じ人の再計算でPVが水増しされるのを防ぐ、2026-10-16)。
window.replaceUrlQuietly = History.prototype.replaceState.bind(history);
if (GA_MEASUREMENT_ID && !isLocalDev) {
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(gaScript);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  // 計算機の入力値(年収・経費など)は共有用にURLのクエリへ入るので、GA4に送るURLからはutm_*以外のクエリを外す(2026-10-16)。
  const cleanUrl = (href) => {
    const u = new URL(href, location.href);
    [...u.searchParams.keys()].forEach((k) => { if (!k.startsWith('utm_')) u.searchParams.delete(k); });
    return u.toString();
  };
  // サイト内の別ページへ移ると、計算後のクエリ付きURLがreferrerとして渡るので、そちらも同じように外す。
  const cleanReferrer = document.referrer ? cleanUrl(document.referrer) : undefined;
  gtag('set', { page_location: cleanUrl(location.href), page_referrer: cleanReferrer });
  gtag('config', GA_MEASUREMENT_ID, { page_location: cleanUrl(location.href), page_referrer: cleanReferrer });

  // アフィリエイトリンクのクリック計測(2026-08-28追加: それまでキーイベントが一切設定されておらず
  // 「どのページが実際に楽天へのクリックを生んでいるか」を測る手段がなかった)。
  // 全ページ共通のdocumentレベル委譲なので、product-grid内で動的に生成されるproduct-cardも個別配線不要で拾える。
  // 中クリック(新しいタブで開く)はclickが発火しないのでauxclickも拾う。
  const onAffiliateClick = (e) => {
    if (e.type === 'auxclick' && e.button !== 1) return;
    const link = e.target.closest('.aff-card, .product-card, .tool-cta, .logo-chip[rel~="sponsored"]');
    if (!link) return;
    // category/price: furusato-nozeiの返礼品カードのみdata-category/data-price属性を持つ(2026-08-31追加)。
    // 他ページのproduct-cardには存在しないため、そのままundefinedになりイベント自体には影響しない。
    gtag('event', 'affiliate_click', {
      link_type: link.classList.contains('product-card') ? 'product_card'
        : link.classList.contains('tool-cta') ? 'tool_cta'
        : link.classList.contains('logo-chip') ? 'logo_chip' : 'aff_card',
      link_id: link.id || link.dataset.tool || '',
      // ふるさと納税の検索リンクには上限額(max)が入るので数値を伏せる。
      link_url: (link.href || '').replace(/(max(?:Price)?(?:=|%3D))\d+/gi, '$1-'),
      page_path: location.pathname,
      category: link.dataset.category || undefined,
      price: link.dataset.price || undefined,
    });
  };
  document.addEventListener('click', onAffiliateClick);
  document.addEventListener('auxclick', onAffiliateClick);
}
