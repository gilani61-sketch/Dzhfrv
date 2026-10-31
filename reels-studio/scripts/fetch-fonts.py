import re, os, urllib.request, ssl
SRC = os.environ.get('GF_CSS', '/tmp/gf.css')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'fonts')
os.makedirs(OUT, exist_ok=True)
css = open(SRC, encoding='utf-8').read()
blocks = re.findall(r"/\*\s*([a-z\-]+)\s*\*/\s*(@font-face\s*\{.*?\})", css, re.S)
KEEP = {'cyrillic', 'latin'}
out_css = []
proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
opener = urllib.request.build_opener(urllib.request.ProxyHandler({'https': proxy, 'http': proxy}) if proxy else urllib.request.BaseHandler())
seen = set()
for subset, block in blocks:
    if subset not in KEEP:
        continue
    fam = re.search(r"font-family:\s*'([^']+)'", block).group(1)
    style = re.search(r"font-style:\s*(\w+)", block).group(1)
    weight = re.search(r"font-weight:\s*(\d+)", block).group(1)
    url = re.search(r"url\((https://[^)]+)\)", block).group(1)
    name = f"{fam.replace(' ','')}-{weight}-{style}-{subset}.woff2"
    path = os.path.join(OUT, name)
    if name not in seen:
        seen.add(name)
        if not os.path.exists(path):
            data = opener.open(url, timeout=60).read()
            open(path, 'wb').write(data)
    ur = re.search(r"unicode-range:\s*([^;]+);", block)
    out_css.append(
        "@font-face{font-family:'%s';font-style:%s;font-weight:%s;font-display:block;"
        "src:url(./%s) format('woff2');%s}" % (
            fam, style, weight, name,
            ("unicode-range:%s;" % ur.group(1).strip()) if ur else ''))
open(os.path.join(OUT, 'fonts.css'), 'w', encoding='utf-8').write('\n'.join(out_css) + '\n')
print('files:', len(seen), 'rules:', len(out_css))
