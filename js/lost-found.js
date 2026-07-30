(() => {
  'use strict';

  const STORAGE_KEY = 'thepetgrid_lost_found_reports';
  const PLACEHOLDER = 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=82';
  const demoReports = [
    {id:'demo-lost-bella',status:'lost',name:'Bella',type:'Dog',breed:'Golden Retriever',city:'Athens, Greece',date:'2026-07-29',description:'Friendly golden retriever wearing a red collar. Last seen near the National Garden.',image:'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=82'},
    {id:'demo-found-cat',status:'found',name:'Unknown Cat',type:'Cat',breed:'Tabby',city:'Thessaloniki, Greece',date:'2026-07-30',description:'Young tabby found safely near the waterfront.',image:'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=82'}
  ];

  const grid = document.querySelector('#lostFoundGrid');
  const filters = [...document.querySelectorAll('[data-lf-filter]')];
  const formSection = document.querySelector('#reportFormSection');
  const form = document.querySelector('#lostFoundForm');
  const formTitle = document.querySelector('#reportFormTitle');
  const statusInput = document.querySelector('#reportStatus');
  const imageInput = document.querySelector('#reportImage');
  const imagePreview = document.querySelector('#reportImagePreview');
  const message = document.querySelector('#reportMessage');
  const params = new URLSearchParams(location.search);
  let imageData = '';

  const safe = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  function savedReports() {
    try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; }
    catch (_) { return []; }
  }
  function allReports() { const saved = savedReports(); return saved.length ? saved : demoReports; }
  function saveReport(report) { const reports = savedReports(); reports.unshift(report); localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); }

  function findPet(id) {
    if (!id) return null;
    const localPet = window.PetStore?.getById?.(id);
    if (localPet) return localPet;
    return null;
  }

  function setMode(mode) {
    const status = mode === 'found' ? 'found' : 'lost';
    statusInput.value = status;
    formTitle.textContent = status === 'lost' ? '🆘 Report a Lost Pet' : '🐾 Report a Found Pet';
    document.querySelectorAll('[data-open-report]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.openReport === status));
  }

  function openForm(mode = 'lost') {
    setMode(mode);
    formSection.hidden = false;
    formSection.scrollIntoView({behavior:'smooth', block:'start'});
    setTimeout(() => document.querySelector('#reportPetName')?.focus(), 350);
  }

  function prefillPet() {
    const pet = findPet(params.get('petId'));
    if (!pet) return;
    document.querySelector('#reportPetName').value = pet.name || '';
    document.querySelector('#reportPetType').value = pet.type || 'Other';
    document.querySelector('#reportBreed').value = pet.breed || '';
    document.querySelector('#reportCountry').value = pet.country || '';
    document.querySelector('#reportCity').value = pet.city || '';
    document.querySelector('#reportOwner').value = pet.owner || '';
    document.querySelector('#reportPetId').value = pet.id || '';
    imageData = pet.image || '';
    imagePreview.src = imageData || PLACEHOLDER;
    imagePreview.hidden = false;
  }

  function render(filter = 'all') {
    if (!grid) return;
    const reports = allReports().filter(item => filter === 'all' || item.status === filter);
    grid.innerHTML = reports.length ? reports.map(item => {
      const status = item.status === 'found' ? 'found' : 'lost';
      return `<article class="lf-card" data-report-id="${safe(item.id)}"><div class="lf-card__media"><img src="${safe(item.image || PLACEHOLDER)}" alt="${safe(item.name || 'Pet report')}" loading="lazy"><span class="lf-status lf-status--${status}">${status.toUpperCase()}</span></div><div class="lf-card__body"><h3>${safe(item.name || 'Unknown pet')}</h3><div class="lf-meta"><span>🐾 ${safe(item.type || 'Pet')}</span><span>📍 ${safe(item.city || 'Location unavailable')}</span></div><p class="lf-description">${safe(item.description || 'Community report')}</p><div class="lf-card__footer"><a href="map.html">View on map →</a><span class="lf-date">${safe(item.date || '')}</span></div></div></article>`;
    }).join('') : '<div class="lf-empty"><strong>No reports in this category yet.</strong>New community reports will appear here.</div>';
  }

  document.querySelectorAll('[data-open-report]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault(); openForm(button.dataset.openReport);
  }));

  document.querySelector('#closeReportForm')?.addEventListener('click', () => { formSection.hidden = true; });

  imageInput?.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); imageInput.value=''; return; }
    if (file.size > 4 * 1024 * 1024) { alert('The image must be smaller than 4 MB.'); imageInput.value=''; return; }
    const reader = new FileReader();
    reader.onload = () => { imageData = String(reader.result || ''); imagePreview.src = imageData; imagePreview.hidden = false; };
    reader.readAsDataURL(file);
  });

  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const city = [data.get('area'), data.get('city'), data.get('country')].filter(Boolean).join(', ');
    const report = {
      id: `lf-${Date.now()}`,
      petId: data.get('petId') || null,
      status: data.get('status') === 'found' ? 'found' : 'lost',
      name: data.get('petName').trim() || 'Unknown pet',
      type: data.get('petType'), breed: data.get('breed').trim(), color: data.get('color').trim(), gender: data.get('gender'),
      date: data.get('date'), country: data.get('country').trim(), city, area: data.get('area').trim(),
      phone: data.get('phone').trim(), email: data.get('email').trim(), owner: data.get('owner').trim(),
      description: data.get('description').trim(), reward: data.get('reward').trim(), image: imageData || PLACEHOLDER,
      createdAt: new Date().toISOString(), resolved: false
    };
    saveReport(report);
    message.textContent = report.status === 'lost' ? 'Lost pet alert published successfully.' : 'Found pet report published successfully.';
    message.hidden = false;
    render(report.status);
    filters.forEach(item => item.classList.toggle('is-active', item.dataset.lfFilter === report.status));
    form.reset(); imageData=''; imagePreview.hidden=true;
    setTimeout(() => document.querySelector('#reports')?.scrollIntoView({behavior:'smooth'}), 500);
  });

  filters.forEach(button => button.addEventListener('click', () => {
    filters.forEach(item => item.classList.remove('is-active')); button.classList.add('is-active'); render(button.dataset.lfFilter || 'all');
  }));

  const requestedMode = params.get('mode');
  if (requestedMode === 'lost' || requestedMode === 'found') { openForm(requestedMode); prefillPet(); }
  render();
})();
