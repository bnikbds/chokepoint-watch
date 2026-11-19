/* Public reading journeys. Research records, saved quotes and the editor retain their own controls. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const create = (tag, className, markup) => {
    const el = document.createElement(tag);
    el.className = className;
    el.innerHTML = markup;
    return el;
  };
  const menu = $('#menu-toggle'), nav = $('#primary-nav');
  function toggleMenu(open) {
    menu.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('menu-open', open);
  }
  menu.addEventListener('click', () => toggleMenu(menu.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('menu-open')) {
      toggleMenu(false);
      menu.focus();
    }
  });
  const headings = {
    observatoire: ['Suivre un passage maritime', 'Choisissez un passage pour lire son trafic, son vent prévu ou son dernier bulletin de sûreté.'],
    briefing: ['Briefings pour les importateurs', 'Ce qui a changé sur une route, ce que cela implique pour votre commande et la prochaine vérification à faire.'],
    scenario: ['Comparer Suez et le Cap', 'Combien de jours, d’euros et de tonnes de CO₂e un détour ajouterait-il à votre envoi ?'],
    routes: ['Explorer les routes maritimes', 'Choisissez un corridor pour voir les passages traversés, le situer sur la carte ou préparer son budget.'],
    budget: ['Chiffrer une expédition', 'Partez du devis de votre transporteur. Indiquez les frais inclus et ceux à ajouter pour calculer le montant de votre lot.'],
    methode: ['Méthode et sources', 'Retrouvez le document d’origine et sa date pour vérifier une donnée avant de prendre une décision.']
  };
  for (const [id, [title, intro]] of Object.entries(headings)) {
    const h = $('#view-' + id + ' .page-heading');
    h.querySelector('h1').textContent = title;
    h.querySelector('h1').tabIndex = -1;
    h.querySelector('p').textContent = intro;
    h.querySelector('.eyebrow')?.remove();
  }
  const skip = $('.skip-link');
  skip.onclick = event => { event.preventDefault(); $('#main').focus(); };
  document.addEventListener('cw-view', event => {
    toggleMenu(false);
    $('#view-' + event.detail + ' h1').focus({preventScroll:true});
    document.title = headings[event.detail][0] + ' · Chokepoint Watch';
  });
  const here = $('.view.active');
  document.title = here.querySelector('h1').textContent + ' · Chokepoint Watch';

  const landing = $('#view-observatoire .page-heading');
  landing.querySelector('button')?.remove();
  landing.append(create('div', 'heading-links', '<button class="btn primary-task" data-view="briefing">Lire le briefing <span aria-hidden="true">↗</span></button><button class="btn" data-view="scenario">Comparer un détour</button>'));
  const annex = $('.atlas-annex');
  if (annex) {
    // The same route and passage inspectors are already available on the map and route pages.
    for (const selector of ['.summary-grid','.watch-grid','#route-strip','.context-strip','#facts-grid']) {
      const element = annex.querySelector(selector);
      if (element) {
        if (element.id === 'facts-grid') element.previousElementSibling.hidden = true;
        element.hidden = true;
      }
    }
    const refresh = $('#refresh-hosted');
    if (refresh) { refresh.hidden = true; }
  }
  const source = $('#view-methode');
  const banner = $('#data-banner');
  source.querySelector('.method-grid').after(banner);
  const register = $('#source-cards');
  const categories = {bulletin:'Bulletins et avis',traffic:'Trafic',market:'Marché',tariff:'Tarifs et devis',reference:'Tarifs et devis',fx:'Change'};
  const sourceFilter = create('label','source-filter','Afficher les sources<select id="source-filter"><option>Toutes les sources</option></select>');
  const sourcePicker = sourceFilter.querySelector('select');
  for (const group of new Set(Object.values(categories))) sourcePicker.add(new Option(group));
  register.before(sourceFilter);
  sourcePicker.onchange = () => {
    const records = window.CWTest.intel().sources;
    [...register.children].forEach((el, i) => { el.hidden = sourcePicker.selectedIndex > 0 && categories[records[i]?.type] !== sourcePicker.value; });
  };
  new MutationObserver(sourcePicker.onchange).observe(register,{childList:true});
  const copy = source.querySelector('.section-heading p');
  if (copy) copy.textContent = '« À recontrôler » indique le temps écoulé depuis la publication. La consultation indique quand l’équipe a ouvert le document.';
  const briefing = $('#view-briefing'), layout = briefing.querySelector('.brief-layout');
  briefing.querySelector('.p1-public-links')?.remove();
  const reader = create('section','published-edition',
    '<div class="edition-date">Édition du <time datetime="2026-11-19">19 novembre 2026</time></div><h2>Peut-on confirmer la livraison à Rotterdam ?</h2>'+
    '<p>Le trafic a augmenté à Suez et diminué à Bab el-Mandeb sur les deux périodes comparées. Ces passages font partie du même itinéraire.</p>'+
    '<p><strong>Pour l’importateur</strong> · Demandez au transporteur de confirmer le service, le trajet et la date d’arrivée de votre commande.</p>'+
    '<a class="btn primary-task" href="p1/briefing.html" hreflang="en">Lire le briefing complet en anglais <span aria-hidden="true">↗</span></a>'+
    '<div class="edition-previous"><a href="p0/briefing.html" hreflang="en">Édition précédente · 18 novembre 2026</a></div>');
  layout.before(reader);
  const editor = create('details','editor-tools','<summary>Préparer un brouillon pour mon corridor</summary><p>Modifiez le texte, ajoutez le nom du relecteur, puis exportez votre note.</p>');
  editor.id = 'brief-editor';
  reader.after(editor);
  editor.append(layout, $('#export-brief'));
  editor.addEventListener('toggle', () => {
    if (editor.open) layout.querySelectorAll('textarea').forEach(el => { el.style.height='auto'; el.style.height=el.scrollHeight+'px'; });
  });

  const budgetExample = $('#p0-demo');
  budgetExample.textContent = 'Essayer avec un devis fictif';
  $('#scenario-example').textContent = 'Essayer avec 2 conteneurs';
  $('#view-scenario .amber-notice p').innerHTML = 'Les distances proposées suivent les tracés de la carte. Remplacez-les par celles de votre transporteur. Pour estimer un surcoût, saisissez deux cotations comparables dans la même devise.';
  const scenarioForm = $('#scenario-form');
  for (const field of scenarioForm.querySelectorAll('input,select')) {
    if (!field.labels?.length && field.id) {
      const holder = field.closest('div');
      const label = holder?.querySelector('label');
      if (label && !label.htmlFor) label.htmlFor = field.id;
    }
  }
  for (const wrapper of document.querySelectorAll('.table-scroll')) {
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role','region');
    wrapper.setAttribute('aria-label','Tableau défilant horizontalement');
  }
})();
