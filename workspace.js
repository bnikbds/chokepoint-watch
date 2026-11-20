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
  // The route, sailing time and carrier request all refer to the same on-screen scenario.
  const results = $('#view-scenario .scenario-results');
  const groups = [
    {output: 'delta-cost', label: 'cotations', fields: [
      ['s-quantity', 'le nombre de conteneurs (1 à 1 000)', x => Number.isInteger(x) && x >= 1 && x <= 1000],
      ['s-quote-base', 'le prix via Suez en euros par conteneur', x => x >= 0],
      ['s-quote-alt', 'le prix via le Cap en euros par conteneur', x => x >= 0],
      ['s-quote-ref', 'la référence des deux devis', null]
    ]},
    {output: 'delta-co2', label: 'CO₂e du lot', fields: [
      ['s-quantity', 'le nombre de conteneurs (1 à 1 000)', x => Number.isInteger(x) && x >= 1 && x <= 1000],
      ['s-mass', 'le poids de marchandise par conteneur (jusqu’à 30 t)', x => x > 0 && x <= 30],
      ['s-factor', 'le facteur en g CO₂e par tonne-km (jusqu’à 500)', x => x > 0 && x <= 500],
      ['s-factor-ref', 'la source du facteur d’émission', null]
    ]}
  ];
  $('#s-quote-ref').placeholder = 'Émetteur, références, dates, équipement, frais inclus';
  $('#s-factor-ref').placeholder = 'Nom de la source, année et périmètre du facteur';
  for (const group of groups) {
    const output = document.getElementById(group.output);
    group.hint = output.nextElementSibling;
    group.hint.setAttribute('aria-live', 'polite');
    group.action = create('button', 'scenario-field-action', '');
    group.action.type = 'button';
    output.parentElement.append(group.action);
    group.action.addEventListener('click', () => {
      const field = document.getElementById(group.action.dataset.field);
      if (!field) return;
      const panel = field.closest('details');
      if (panel) panel.open = true;
      field.focus();
    });
  }
  const handover = create('details', 'simple-card carrier-request',
    '<summary>Préparer une demande au transporteur</summary>' +
    '<p>Copiez le texte puis ajoutez votre référence de réservation avant de l’envoyer vous-même.</p>' +
    '<label for="carrier-text">Demande de confirmation</label><textarea id="carrier-text" rows="6" readonly></textarea>' +
    '<button type="button" class="btn" id="copy-carrier-text">Copier la demande</button> <span id="copy-carrier-status" role="status"></span>');
  results.append(handover);
  const request = $('#carrier-text');
  const copyRequest = $('#copy-carrier-text');
  const copyStatus = $('#copy-carrier-status');
  let copyRevision = 0;
  function refreshScenarioHelp() {
    for (const group of groups) {
      const missing = group.fields.find(([id, , valid]) => {
        const value = document.getElementById(id).value.trim();
        return !value || (valid && !valid(Number(value)));
      });
      group.action.hidden = !missing;
      if (missing) {
        const [id, description] = missing;
        group.hint.textContent = 'À renseigner : ' + description + '.';
        group.action.textContent = id === 's-quote-ref' ? 'Ajouter la référence des devis' : 'Compléter ce champ';
        group.action.setAttribute('aria-label', group.action.textContent + ' : ' + description);
        group.action.dataset.field = id;
      } else {
        group.hint.textContent = group.output === 'delta-cost'
          ? 'Différence pour tout le lot, d’après les deux prix saisis.'
          : 'Différence pour tout le lot, selon la masse et le facteur saisis.';
      }
    }
    const route = $('#scenario-route').selectedOptions[0];
    const quantity = Number($('#s-quantity').value);
    const result = window.currentScenario;
    copyRevision++;
    copyStatus.textContent = '';
    copyRequest.disabled = !route || !result || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000;
    if (copyRequest.disabled) {
      request.value = 'Vérifiez le corridor, les hypothèses de trajet et le nombre de conteneurs.';
      return;
    }
    const unit = quantity === 1 ? 'conteneur' : 'conteneurs';
    const time = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 1}).format(Math.abs(result.deltaDays));
    const difference = result.deltaDays === 0 ? 'la même durée' : time + (Math.abs(result.deltaDays) < 2 ? ' jour' : ' jours') + (result.deltaDays > 0 ? ' de plus' : ' de moins');
    request.value = 'Bonjour,\nPour notre envoi de ' + quantity + ' ' + unit + ' sur le corridor ' + route.textContent.trim() +
      ', pouvez-vous confirmer le service prévu, le passage via Suez ou le Cap et la date d’arrivée estimée ? ' +
      'Notre simulation donne ' + difference + ' via le Cap. Pouvez-vous confirmer le délai pour cette réservation ?\n' +
      'Si vous proposez les deux routes, merci de préciser pour chacune le prix par conteneur, les surcharges incluses et la date de validité du devis.';
  }
  copyRequest.addEventListener('click', async () => {
    const revision = copyRevision;
    try {
      await navigator.clipboard.writeText(request.value);
      if (revision === copyRevision) copyStatus.textContent = 'Demande copiée.';
    } catch {
      if (revision !== copyRevision) return;
      request.focus();
      request.select();
      copyStatus.textContent = 'Texte sélectionné. Utilisez la commande Copier de votre appareil.';
    }
  });
  // The calculator also runs after a deep link, an example or a corridor change.
  new MutationObserver(refreshScenarioHelp).observe($('#delta-days'), {childList:true, characterData:true, subtree:true});
  refreshScenarioHelp();
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
