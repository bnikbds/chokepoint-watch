"""Exercise the shipping workspace against the deployment snapshot, independent of a fixed shipping date."""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path(os.environ['CW_EVIDENCE'])
base=os.environ.get('CW_TEST_URL','http://127.0.0.1:8769/')
checks=[]
def verify(label, value):
    assert value, label
    checks.append(label)
    print('PASS', label, flush=True)
def nav(page, view):
    menu=page.locator('#menu-toggle')
    if menu.is_visible():
        menu.click()
    page.locator(f'#primary-nav [data-view="{view}"]').click()
def fits(page):
    return page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.getenv('CW_CHROME') or shutil.which('google-chrome') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
    ctx=browser.new_context(viewport={'width':1440,'height':960},locale='fr-FR')
    ctx.route('https://**/*',lambda r:r.abort())
    page=ctx.new_page()
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.goto(base)
    page.wait_for_function('window.CWMonitorData?.passages?.suez?.traffic?.rows.length > 0')
    verify('Default Suez selection agrees with its detail', page.locator('#atlas-find').input_value()=='suez' and 'Suez' in page.locator('#atlas-detail h3').inner_text())
    page.screenshot(path=str(out/'desktop-home.png'),animations='disabled')
    page.locator('#atlas-history').click()
    card=page.locator('.chart-card:visible')
    verify('One action reaches the selected annual chart',card.count()==1 and 'Suez' in card.locator('h3').inner_text())
    card.locator('.month-table summary').click()
    verify('Twelve dated rows reproduce actual daily counts',page.evaluate("""() => {
      const months=[...document.querySelectorAll('.chart-card:not([hidden]) tbody tr')];
      const rows=CWMonitorData.passages.suez.traffic.rows;
      return months.length===12 && months.every(tr=>{
        const [month,total,container,coverage]=[...tr.children].map(c=>c.textContent);
        const sub=rows.filter(r=>r.date.startsWith(month));
        const number=t=>Number(t.replace(/\\s/g,'').replace(',','.'));
        return sub.length===Number(coverage.split('/')[0]) && (!sub.length ||
          ['n_total','n_container'].every((key,i)=>Math.abs(sub.reduce((n,r)=>n+r[key],0)/sub.length-number([total,container][i]))<.051));
      });
    }"""))
    page.locator('#history-passage').select_option('panama')
    verify('Panama has 12 distinct monthly values',page.locator('.chart-card:visible .chart-month').count()==12)
    page.locator('#history-passage').select_option('aden')
    verify('A passage without a series explains the gap',page.locator('#history-coverage').is_visible() and page.locator('.chart-card:visible').count()==0)
    page.locator('#history-passage').select_option('all')
    verify('Six charts can be compared',page.locator('.chart-card:visible').count()==6)
    nav(page,'briefing')
    verify('Briefing opens the dated publication before the editor',page.locator('.published-edition a').first.is_visible() and not page.locator('#brief-editor').get_attribute('open'))
    page.locator('.published-edition a').first.click()
    verify('Both editions are publicly reachable',page.locator('h1').inner_text().startswith('Can we promise') and page.request.get(base+'p0/briefing.html').ok)
    page.go_back();nav(page,'routes')
    route=page.locator('[data-map-route]').last
    route_id=route.get_attribute('data-map-route');route.click()
    verify('Corridors open their exact route on the visible map',page.locator('#atlas-route').input_value()==route_id and page.locator('.route-options').get_attribute('open') is not None)
    page.go_back()
    verify('Browser Back returns to corridors',page.locator('#view-routes').is_visible())
    page.go_forward()
    verify('Browser Forward restores the map',page.locator('#view-observatoire').is_visible())
    nav(page,'scenario');page.locator('#scenario-example').click()
    verify('Cape scenario changes time, cost and CO2',page.evaluate('Math.abs(currentScenario.deltaDays-8.437365)<.001 && currentScenario.deltaCost===1000 && Math.abs(currentScenario.deltaCo2-2.4)<.001'))
    page.locator('#scenario-map').click()
    verify('Scenario draws the selected corridor and its Cape alternative',page.locator('#atlas-route').input_value()=='sha-rot' and page.locator('#atlas-alt').is_checked())
    nav(page,'budget');page.locator('#p0-demo').click()
    verify('Budget uses documented inclusions and shipment quantity',page.evaluate('window.currentQuoteResult.total===4860'))
    with page.expect_download() as downloaded:
        page.locator('#export-budget').click()
    verify('Export contains the same total',json.loads(downloaded.value.path().read_text())['result']['total']==4860)
    nav(page,'methode');page.locator('#source-filter').select_option(label='Trafic')
    verify('Source filter isolates PortWatch',page.locator('#source-cards article:visible').count()==1 and 'PortWatch' in page.locator('#source-cards article:visible').inner_text())
    nav(page,'observatoire');page.locator('.atlas-annex>summary').click()
    page.locator('#traffic-csv').set_input_files({'name':'local.csv','mimeType':'text/csv','buffer':b'date,portid,n_total,n_container\n2026-11-01,chokepoint1,24,6'})
    page.wait_for_function("CWTest.live().traffic?.mode==='import'")
    page.reload();page.wait_for_function("window.CWMonitorData?.passages?.suez")
    verify('A personal CSV survives an automatic refresh and reopening',page.evaluate("CWTest.live().traffic.mode==='import' && CWTest.live().traffic.rows.length===1"))
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844})
        for view in ['observatoire','briefing','routes','scenario','budget','methode']:
            nav(page,view)
            if not fits(page):
                print(page.evaluate("Array.from(document.querySelectorAll('.view.active *,nav,header')).filter(e=>e.getBoundingClientRect().right>innerWidth+2).map(e=>[e.id||e.className,e.getBoundingClientRect().right]).slice(0,18)"),flush=True)
            verify(f'{width}px · {view} stays within viewport',fits(page))
        if width==390:
            nav(page,'observatoire')
            page.screenshot(path=str(out/'mobile-home.png'),animations='disabled')
            page.locator('#menu-toggle').click();page.keyboard.press('Escape')
            verify('Mobile menu closes with Escape and restores focus',page.evaluate("document.activeElement.id==='menu-toggle' && document.activeElement.getAttribute('aria-expanded')==='false'"))
    failure=ctx.new_page()
    failure.route('**/data/monitor.json*',lambda r:r.abort())
    failure.goto(base);failure.locator('#monitor-reload').wait_for(state='attached')
    verify('Network failure gives a recovery action and explicit missing status',failure.locator('#monitor-reload').count()==1 and 'indisponible' in failure.locator('#atlas-date').inner_text().lower())
    failure.unroute('**/data/monitor.json*')
    failure.locator('#atlas-retry').click()
    failure.wait_for_function('window.CWMonitorData?.passages?.suez')
    failure.locator('.atlas-annex>summary').click()
    failure.locator('#autonomous-monitor table tbody tr').first.wait_for()
    verify('A retry recovers without reloading the page',failure.locator('#autonomous-monitor table tbody tr').count()==9 and failure.locator('#atlas-retry').is_hidden() and not failure.evaluate('window.CWMonitorUnavailable'))
    verify('No uncaught script error',not errors)
    browser.close()
(out/'workspace-checks.json').write_text(json.dumps({'checks':checks},ensure_ascii=False,indent=2))
