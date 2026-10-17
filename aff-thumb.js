// 「楽天市場で見てみる」カード(#aff-card)を画像付きにする(2026-10-17)。
// カードのアイコン(.aff-icon、SVG)を、同じページの商品カード(#product-grid)の先頭の商品写真(128px)に置き換える。
// リンク(<a>、楽天公式「URLからリンク作成」の出力)には触らない。写真は見た目の部分(.aff-icon)にだけ入れ、
// カード全体を押せる範囲は既存のCSS(::after)のまま。商品が取れていない間・失敗時はSVGアイコンのまま。
// 商品を取り直したとき(入力の変更など)は、先頭の写真に追従する。追加のAPI呼び出しはしない。
// 商品カードの一覧(#product-grid)がないページでは何もしない。
(function () {
  function init() {
    var card = document.getElementById('aff-card');
    var icon = card && card.querySelector('.aff-icon');
    var grid = document.getElementById('product-grid');
    if (!card || !icon || !grid) return;
    card.classList.add('thumb-ready'); // 48px四角の枠を先に確保する(写真が入っても高さが変わらない)
    function apply() {
      var first = grid.querySelector('.product-card img');
      var src = first && first.getAttribute('src');
      if (!src) return; // 取得中・失敗中は、いまの表示(SVGか直前の写真)のまま
      var cur = icon.querySelector('img');
      if (cur && cur.getAttribute('data-origin') === src) return;
      var img = document.createElement('img');
      img.alt = '';
      img.width = 48;
      img.height = 48;
      img.decoding = 'async';
      img.setAttribute('data-origin', src);
      img.addEventListener('error', function () { if (img.getAttribute('src') !== src) img.src = src; }, { once: true });
      img.src = src.replace(/_ex=\d+x\d+/, '_ex=128x128');
      icon.textContent = '';
      icon.appendChild(img);
    }
    new MutationObserver(apply).observe(grid, { childList: true, subtree: true });
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
