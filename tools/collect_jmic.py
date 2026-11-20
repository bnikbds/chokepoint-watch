"""Copy dated regional classifications from the official UKMTO catalogue and JMIC PDFs."""
import calendar
import json
import re
import subprocess
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
FILE = ROOT / 'data/jmic-editions.js'
PREFIX = 'globalThis.CWJMICFeed = '
API = 'https://sccd.royalnavy.mod.uk/api/ukmto'
CATALOG = '84a787ea-9bf6-4f47-9689-e2c0546dbdad'
LEVELS = {'LOW', 'MODERATE', 'SUBSTANTIAL', 'SEVERE', 'CRITICAL'}
REGIONS = {'northern red sea / suez canal':'suez', 'bab el-mandeb / southern red sea':'bab', 'gulf of aden':'aden'}

def get(url):
    return subprocess.check_output(['curl','--user-agent','ChokepointWatch/1.0 (+https://github.com/bnikbds/chokepoint-watch)', '--header','Accept: application/json' if url.startswith(API+'/') else 'Accept: application/pdf','--fail','--silent','--show-error','--retry','2','--max-time','30','--max-filesize','20000000',url],timeout=110)

def listing(path):
    rows = json.loads(get(API + '/' + path))
    if not isinstance(rows,list):
        raise ValueError('Unrecognized catalogue')
    return rows

def extract(text, number, issued):
    head = text[:800]
    match = re.search(r'Update\s+(\d+)\s+to JMIC Advisory Note',head,re.I)
    stamp = re.search(r'[–—-]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})',head)
    if not match or int(match[1]) != number or not stamp or datetime.strptime(stamp[1],'%d %B %Y').date() != issued:
        raise ValueError('PDF number or date disagrees with the catalogue')
    sections = [(i,p) for i,p in enumerate(text.split('\f'),1) if re.search(r'^\s*3\.\s+Regional Threat Overview',p,re.M)]
    if len(sections)!=1:
        raise ValueError('Regional overview unavailable')
    page, table = sections[0]
    header = re.search(r'^ *Region +Threat Level +Notes *$',table,re.M)
    if not header:
        raise ValueError('Unrecognized regional table')
    col = header[0].index('Threat Level')-1
    levels = {}
    for block in re.split(r'\n[ \t]*\n',table[header.end():]):
        lines = block.splitlines()
        region = ' '.join(line[:col].strip() for line in lines if line[:col].strip()).lower()
        region = re.sub(r'\s+', ' ',region)
        key = REGIONS.get(region)
        if key:
            values = [m[1] for line in lines if (m:=re.match(r'^ *(LOW|MODERATE|SUBSTANTIAL|SEVERE|CRITICAL)(?: {2,}|$)',line[col:])) and len(line[col:])-len(line[col:].lstrip())<10]
            if key in levels or len(values)!=1:
                raise ValueError('Ambiguous regional category')
            levels[key]=values[0]
    if set(levels)!=set(REGIONS.values()):
        raise ValueError('Unrecognized or incomplete regional coverage')
    return page,levels

def refresh():
    previous=json.loads(FILE.read_text()[len(PREFIX):].strip().removesuffix(';'))
    archive={e['number']:e for e in previous['editions']}
    today=datetime.now(timezone.utc).date()
    start=date.fromisoformat(max(e['date'] for e in archive.values())).replace(day=1)
    problems=[]
    try:
        years=listing('products-count/'+CATALOG)
        if not years:raise ValueError('Empty catalogue')
        seen=False
        for year in sorted(int(row['name']) for row in years if start.year<=int(row['name'])<=today.year):
            for month in listing(f'products-count/{CATALOG}/{year}'):
                first=date(year,list(calendar.month_name).index(month['name']),1)
                if not start<=first<=today:continue
                records=listing('products/'+str(UUID(month['id'])))
                if not records and month['productItemCount']:raise ValueError('Empty month')
                for item in records:
                    title=item['reference']+' '+item['name']
                    match=re.search(r'\bupdate[\s_-]*(\d+)\b',title.replace('_',' '),re.I)
                    if not match:continue
                    num=int(match[1]);issued=date.fromisoformat(item['issueDate'][:10]);url=item['pdfUrl']
                    if issued>today:continue
                    seen=True
                    if archive.get(num,{}).get('url')==url and archive[num]['date']==issued.isoformat():continue
                    if num<min(archive):continue
                    try:
                        link=urlsplit(url)
                        if link.scheme!='https' or link.netloc!='www.ukmto.org' or not link.path.lower().startswith('/-/media/') or not link.path.lower().endswith('.pdf'):raise ValueError('Unexpected PDF address')
                        pdf=get(url)
                        text=subprocess.run(['pdftotext','-layout','-','-'],input=pdf,capture_output=True,check=True,timeout=35).stdout.decode()
                        page,levels=extract(text,num,issued)
                        archive[num]=dict(number=num,date=issued.isoformat(),url=url,checked=today.isoformat(),page=page,section=3,levels=levels)
                    except Exception as error:
                        problems.append(f'Bulletin {num}: {error}')
        if not seen:raise ValueError('No eligible regional advisory in the catalogue')
    except Exception as error:
        problems.append(str(error))
    result={'attempted_at':datetime.now(timezone.utc).isoformat(timespec='seconds'),'status':'review' if problems else 'ok','editions':sorted(archive.values(),key=lambda e:(e['date'],e['number']),reverse=True)}
    tmp=FILE.with_suffix('.tmp');tmp.write_text(PREFIX+json.dumps(result,ensure_ascii=True,indent=2)+';\n');tmp.replace(FILE)
    print(result['status'], 'latest edition',result['editions'][0]['number'],*problems)
    return bool(problems)

if __name__=='__main__':
    raise SystemExit(refresh())
