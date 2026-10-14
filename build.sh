#!/usr/bin/env bash
# One codebase (src/) -> chrome/ and safari/extension/ + zips.
set -e; cd "$(dirname "$0")"
rm -rf chrome safari/extension && mkdir -p chrome safari/extension
cp -r src/* chrome/; cp -r src/* safari/extension/
python3 - <<'PY'
import json
m=json.load(open('safari/extension/manifest.json'))
m['background']={'scripts':['background.js'],'persistent':False}   # iOS requires non-persistent
m['browser_specific_settings']={'safari':{'strict_min_version':'16.4'}}
json.dump(m,open('safari/extension/manifest.json','w'),indent=2)
import zipfile,os
for src,out in (('chrome','empsize-chrome.zip'),('safari/extension','empsize-safari-extension.zip')):
    z=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED)
    for r,_,fs in os.walk(src):
        for f in fs: p=os.path.join(r,f); z.write(p,os.path.relpath(p,src))
PY
echo built
