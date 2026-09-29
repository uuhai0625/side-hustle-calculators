# site_map.jsonからナビ・パンくず・関連リンクを各ページへ静的HTMLとして書き込む(app/で実行、再実行可)。
# JSで描画しないのは、sitemapが読まれていない現状ではページ発見を内部リンクに頼っているため。
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / '_tools' / 'site_map.json').read_text(encoding='utf-8'))
CAT = {c['id']: c['label'] for c in DATA['categories']}
PAGES = DATA['pages']
SVG_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
MARK_NOTE = '自動生成: _tools/build_nav.py(手編集すると次回実行で上書きされる)'
e = html.escape


def validate():
    errors = []
    for slug, p in PAGES.items():
        if not (ROOT / slug / 'index.html').is_file():
            errors.append(f'{slug}: index.htmlがない')
        if p['category'] not in CAT:
            errors.append(f'{slug}: 未知のカテゴリ {p["category"]}')
        for n in p['next']:
            if n['slug'] not in PAGES or n['slug'] == slug:
                errors.append(f'{slug}: nextのslugが不正 {n["slug"]}')
    if errors:
        sys.exit('\n'.join(errors))
    for d in sorted(ROOT.iterdir()):
        if (d / 'index.html').is_file() and d.name not in PAGES:
            print(f'警告: {d.name}/ がsite_map.jsonに載っていない', file=sys.stderr)


def icon(slug):
    return f'<span class="icon-svg" aria-hidden="true">{SVG_OPEN}{PAGES[slug]["icon"]}</svg></span>'


def nav_block(slug):
    cur = PAGES[slug]['category']
    current = ' aria-current="true"'
    items = ''.join(
        f'<a href="../#{c["id"]}"{current if c["id"] == cur else ""}>{e(c["label"])}</a>'
        for c in DATA['categories'])
    return ['<nav class="site-nav" aria-label="カテゴリ">', '  ' + items, '</nav>']


def breadcrumb_block(slug):
    p = PAGES[slug]
    return ['<nav class="breadcrumb" aria-label="パンくずリスト"><ol>'
            '<li><a href="../">トップ</a></li>'
            f'<li><a href="../#{p["category"]}">{e(CAT[p["category"]])}</a></li>'
            f'<li aria-current="page">{e(p["label"])}</li>'
            '</ol></nav>']


def jsonld_block(slug):
    ld = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'AI副業そろばん', 'item': DATA['base_url']},
            {'@type': 'ListItem', 'position': 2, 'name': PAGES[slug]['label'], 'item': f'{DATA["base_url"]}{slug}/'},
        ],
    }
    # </script>で抜け出せないよう<をエスケープ
    return ['<script type="application/ld+json">', json.dumps(ld, ensure_ascii=False).replace('<', '\\u003c'), '</script>']


def link(slug, query='', reason=None):
    text = f'<span class="related-tool-title">{e(PAGES[slug]["label"])}</span>'
    if reason:
        text = f'<span class="related-tool-text">{text}<span class="related-tool-comment">{e(reason)}</span></span>'
    return f'<a class="related-tool-link" href="../{slug}/{e(query)}">{icon(slug)}{text}</a>'


def related_block(slug):
    p = PAGES[slug]
    nxt = [n['slug'] for n in p['next']]
    lines = ['<nav class="related-tools" aria-label="関連ページ">', '  <h2>次に見るなら</h2>', '  <div class="related-tools-list">']
    lines += ['    ' + link(n['slug'], n.get('query', ''), n['reason']) for n in p['next']]
    lines.append('  </div>')
    same = [s for s, q in PAGES.items() if q['category'] == p['category'] and s != slug and s not in nxt]
    if same:
        lines.append(f'  <h3 class="related-sub">同じカテゴリ({e(CAT[p["category"]])})のページ</h3>')
        lines.append('  <div class="related-tools-list related-compact">')
        lines += ['    ' + link(s) for s in same]
        lines.append('  </div>')
    lines.append('</nav>')
    return lines


def wrap(name, lines, indent, nl):
    body = nl.join(indent + ln for ln in lines)
    return f'{indent}<!-- {name}:start {MARK_NOTE} -->{nl}{body}{nl}{indent}<!-- {name}:end -->'


def find_div_end(s, start):
    depth = 0
    for m in re.finditer(r'<div\b|</div>', s[start:]):
        depth += 1 if m.group(0) == '<div' else -1
        if depth == 0:
            return start + m.end()
    raise ValueError('divの閉じタグが対応していない')


# 初回(マーカーがまだない)の挿入位置: (正規表現, 置き換え方)。'after'はマッチの後ろに挿入、'replace'はマッチを置換
FIRST = {
    'site-nav': (r'([ \t]*)<h1 class="site-tagline">.*?</h1>', 'after'),
    'breadcrumb': (r'([ \t]*)<a class="back-link" href="\.\./">← ツール一覧にもどる</a>', 'replace'),
    'breadcrumb-ld': (r'([ \t]*)</head>', 'before'),
    'related': (r'([ \t]*)<div class="related-tools">\s*<h2>(?:こんな(?:ページ|計算機)もあります|個別に試算するならこちら)</h2>', 'div'),
}


def put(slug, s, name, lines, nl):
    starts = len(re.findall(rf'<!-- {name}:start\b', s))
    ends = s.count(f'<!-- {name}:end -->')
    if starts != ends or starts > 1:
        raise ValueError(f'{slug}: {name}のマーカーが壊れている(start {starts} / end {ends})')
    m = re.search(rf'([ \t]*)<!-- {name}:start\b.*?<!-- {name}:end -->', s, re.S)
    if m:
        return s[:m.start()] + wrap(name, lines, m.group(1), nl) + s[m.end():]
    pattern, mode = FIRST[name]
    m = re.search(pattern, s)
    if not m:
        raise ValueError(f'{slug}: {name}の挿入位置が見つからない')
    blk = wrap(name, lines, m.group(1), nl)
    if mode == 'after':
        return s[:m.end()] + nl + blk + s[m.end():]
    if mode == 'before':
        return s[:m.start()] + blk + nl + s[m.start():]
    if mode == 'div':
        return s[:m.start()] + blk + s[find_div_end(s, m.start() + len(m.group(1))):]
    return s[:m.start()] + blk + s[m.end():]


def build(slug):
    raw = (ROOT / slug / 'index.html').read_bytes()
    s = raw.decode('utf-8')
    crlf = s.count('\r\n')
    nl = '\r\n' if crlf >= s.count('\n') - crlf else '\n'
    s = put(slug, s, 'site-nav', nav_block(slug), nl)
    s = put(slug, s, 'breadcrumb', breadcrumb_block(slug), nl)
    s = put(slug, s, 'breadcrumb-ld', jsonld_block(slug), nl)
    s = put(slug, s, 'related', related_block(slug), nl)
    return s.encode('utf-8')


if __name__ == '__main__':
    validate()
    out = {slug: build(slug) for slug in PAGES}
    for slug, b in out.items():
        path = ROOT / slug / 'index.html'
        if path.read_bytes() != b:
            path.write_bytes(b)
            print('updated', slug)
