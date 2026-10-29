"""Public-source collector. No credentials, no fabricated missing values."""
import json, math, statistics, urllib.request, urllib.parse, time
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
API='https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query'
PLACES={
'suez':('Canal de Suez',30.5,32.35,['Suez Canal']),
'panama':('Canal de Panama',9.1,-79.75,['Panama Canal']),
'bab':('Bab el-Mandeb',12.6,43.35,['Bab el-Mandeb Strait','Bab el-Mandeb']),
'aden':('Golfe d’Aden',12.5,49,['Gulf of Aden']),
'malacca':('Détroit de Malacca',4,100,['Malacca Strait','Strait of Malacca']),
'singapore':('Détroit de Singapour',1.2,103.9,['Singapore Strait','Strait of Singapore']),
'sicily':('Canal de Sicile',37.5,11.6,['Sicily Strait','Strait of Sicily']),
'gibraltar':('Détroit de Gibraltar',35.9,-5.7,['Gibraltar Strait','Strait of Gibraltar']),
'dover':('Pas de Calais',51,1.6,['Dover Strait','Strait of Dover'])}
def get(url,params=None):
    if params:url+='?'+urllib.parse.urlencode(params)
    for attempt in range(2):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'ChokepointWatch-academic/1.0'})
            with urllib.request.urlopen(req,timeout=15) as r: obj=json.load(r)
            if 'error' in obj:raise ValueError(str(obj['error']))
            return obj
        except Exception:
            if attempt==1:raise
            time.sleep(1+attempt)
def iso(value):
    return datetime.fromtimestamp(value/1000,timezone.utc).date().isoformat() if isinstance(value,(float,int)) else date.fromisoformat(value[:10]).isoformat()
def validate(rows,cp,now):
    seen=set();out=[]
    for r in rows:
        d=iso(r['date']);n=r['n_total'];c=r['n_container']
        if r['portid']!=cp or d>now or d in seen:raise ValueError('Date, identité ou doublon invalide')
        if any(isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or v<0 or int(v)!=v for v in [n,c]) or c>n:raise ValueError('Comptage invalide')
        seen.add(d);out.append(dict(date=d,portid=cp,portname=r['portname'],n_total=n,n_container=c))
    if not out:raise ValueError('Série vide')
    return sorted(out,key=lambda r:r['date'])
def stats(rows,now):
    end=date.fromisoformat(rows[-1]['date']);by={r['date']:r for r in rows}
    def window(start,days):return [by.get((start+timedelta(days=i)).isoformat()) for i in range(days)]
    recent=window(end-timedelta(days=27),28);prior=window(end-timedelta(days=55),28)
    good=lambda arr:all(x is not None for x in arr)
    avg=lambda arr,key:statistics.mean(x[key] for x in arr)
    a=avg(recent,'n_total') if good(recent) else None
    b=avg(prior,'n_total') if good(prior) else None
    # Reference preceding 337 days, excluding last 28; require at least 300 days.
    baseline=[r['n_total'] for r in rows if end-timedelta(days=364)<=date.fromisoformat(r['date'])<=end-timedelta(days=28)]
    ref=statistics.median(baseline) if len(baseline)>=300 else None
    stale=(date.fromisoformat(now)-end).days>14
    score=round(max(0,min(100,100*(1-a/ref)))) if not stale and a is not None and ref and ref>0 else None
    return dict(latest=end.isoformat(),mean28=a,container28=avg(recent,'n_container') if good(recent) else None,change28=round(100*(a/b-1),1) if a is not None and b else None,baseline=ref,baseline_days=len(baseline),score=score,stale=stale,days=len(rows))
def collect():
    now=datetime.now(timezone.utc);stamp=now.isoformat();today=now.date().isoformat()
    path=ROOT/'data/monitor.json';old=json.loads(path.read_text()) if path.exists() else {};out={'schema':1,'attempted_at':stamp,'methodology':'risk-v1','passages':{},'errors':[]}
    try:
        catalog=get(API.replace('Daily_Chokepoints_Data','PortWatch_chokepoints_database'),dict(f='json',where='1=1',outFields='portid,portname',returnDistinctValues='true',returnGeometry='false'))['features']
        catalog=[f['attributes'] for f in catalog]
    except Exception as e:catalog=[];out['errors'].append('PortWatch catalogue: '+str(e))
    for key,(name,lat,lon,aliases) in PLACES.items():
        p=dict(name=name,latitude=lat,longitude=lon,traffic=None,weather=None,security_score=None,security_status='Non évalué automatiquement : bulletin officiel à vérifier',errors=[])
        matches=[r for r in catalog if r['portname'].casefold() in [a.casefold() for a in aliases]]
        try:
            if len(matches)!=1:raise ValueError('Pas de série distincte identifiée dans le catalogue PortWatch' if catalog else 'Catalogue PortWatch inaccessible')
            cp=matches[0]['portid'];rows=[];offset=0
            while True:
                q=dict(f='json',where="portid = '%s' AND date >= DATE '%s'"%(cp,(now.date()-timedelta(days=425)).isoformat()),outFields='*',returnGeometry='false',orderByFields='date ASC',resultRecordCount=1000)
                if offset:q['resultOffset']=offset
                d=get(API,q);part=[f['attributes'] for f in d['features']];rows+=part
                if not d.get('exceededTransferLimit'):break
                if not part or offset>=6000:raise ValueError('Pagination incomplète')
                offset+=len(part)
            rows=validate(rows,cp,today)
            p['traffic']=dict(rows=rows,**stats(rows,today),source=API,fetched_at=stamp,portid=cp)
        except Exception as e:
            p['errors'].append('Trafic : '+str(e))
            previous=old.get('passages',{}).get(key,{}).get('traffic')
            if previous:
                p['traffic']={**previous,**stats(previous['rows'],today),'retained':True}
        try:
            url='https://api.open-meteo.com/v1/forecast'
            w=get(url,dict(latitude=lat,longitude=lon,hourly='wind_speed_10m',forecast_hours=24,timezone='UTC',wind_speed_unit='kn',cell_selection='nearest'))
            vals=w['hourly']['wind_speed_10m'];times=w['hourly']['time']
            if len(vals)!=24 or len(times)!=24 or any(not isinstance(v,(int,float)) or not math.isfinite(v) or v<0 for v in vals):raise ValueError('Prévision incomplète')
            peak=max(vals);score=round(max(0,min(100,(peak-15)*100/35)))
            p['weather']=dict(peak_knots=peak,score=score,start=times[0]+'Z',end=times[-1]+'Z',fetched_at=stamp,source=url,kind='Prévision modélisée au point représentatif, pas mesure ni état de mer')
        except Exception as e:p['errors'].append('Météo : '+str(e))
        available=[x['score'] for x in [p['traffic'],p['weather']] if x and x.get('score') is not None]
        p['operational_score']=max(available) if available else None
        p['coverage']=len(available);out['passages'][key]=p
    path.parent.mkdir(exist_ok=True);path.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'attempted_at':stamp,'passages':{k:{'traffic':bool(v['traffic']),'weather':bool(v['weather']),'errors':v['errors']} for k,v in out['passages'].items()}},ensure_ascii=False))
if __name__=='__main__':collect()
