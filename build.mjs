// Baut die Website aus content/site.json + template.html -> dist/
import fs from 'node:fs';
import path from 'node:path';
const rd = f => JSON.parse(fs.readFileSync('content/' + f, 'utf8'));
const k = rd('kontakt.json');
const site = { contact: k.contact, hours: k.hours, towns: k.towns, services: rd('leistungen.json'), faq: rd('faq.json'), texts: rd('texte.json') };
const icons = JSON.parse(fs.readFileSync('content/icons.json', 'utf8'));
let html = fs.readFileSync('template.html', 'utf8');
const LANGS = { de: ['Deutsch', 'ltr'], ar: ['العربية', 'rtl'], ku: ['Kurdî', 'ltr'], tr: ['Türkçe', 'ltr'], en: ['English', 'ltr'], fr: ['Français', 'ltr'] };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const c = site.contact, de = site.texts.de;
const img = p => String(p || '').replace(/^\//, '');

const services = site.services.map((s, i) => `      <article class="card rv"><div class="phw"><img class="ph" src="${esc(img(s.image))}" alt="${esc(s.alt || s.title.de)}" width="800" height="600" loading="lazy" decoding="async"></div><div class="cb"><div class="icon">${icons[s.icon] || icons.sparkle}</div><h3 data-i18n="s${i + 1}t">${esc(s.title.de)}</h3><p data-i18n="s${i + 1}d">${esc(s.text.de)}</p></div></article>`).join('\n');
const faq = site.faq.map((f, i) => `      <details${i === 0 ? ' open' : ''}><summary data-i18n="fq${i + 1}">${esc(f.q.de)}</summary><p data-i18n="fa${i + 1}">${esc(f.a.de)}</p></details>`).join('\n');
const pin = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
const towns = site.towns.map((t, i) => i === 0 ? `\n        <li class="main">${pin}${esc(t)}</li>` : `<li>${esc(t)}</li>`).join('') + '\n      ';
const opts = site.services.map((s, i) => `<option data-i18n="s${i + 1}t">${esc(s.title.de)}</option>`).join('');
const foot = site.services.slice(0, 4).map((s, i) => `<li><a href="#leistungen" data-i18n="s${i + 1}t">${esc(s.title.de)}</a></li>`).join('');
const jsonld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: c.company, description: 'Gebäudereinigung in Minden und Umgebung', image: 'img/og.jpg', logo: 'img/logo.png', telephone: c.phone_intl, email: c.email,
  address: { '@type': 'PostalAddress', streetAddress: c.street, postalCode: c.city.split(' ')[0], addressLocality: c.city.split(' ').slice(1).join(' '), addressCountry: 'DE' },
  areaServed: site.towns, knowsLanguage: ['de', 'ar', 'ku', 'tr', 'en', 'fr'],
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: site.hours.weekdays.split('–')[0], closes: site.hours.weekdays.split('–')[1] }, { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: site.hours.saturday.split('–')[0], closes: site.hours.saturday.split('–')[1] }] }).replace(/</g, '\\u003c');

html = html.replace('<!--SERVICES-->', services).replace('<!--FAQ-->', faq).replace('<!--TOWNS-->', towns)
  .replace('<!--SERVICE_OPTIONS-->', opts).replace('<!--FOOTER_SERVICES-->', foot);
const vars = { JSONLD: jsonld, phone: esc(c.phone), phone_intl: esc(c.phone_intl), whatsapp: esc(c.whatsapp), email: esc(c.email), street: esc(c.street), city: esc(c.city),
  hours_weekdays: esc(site.hours.weekdays), hours_saturday: esc(site.hours.saturday), build: Date.now().toString(36) };
html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
// Deutsche Texte statisch einsetzen (für Google)
html = html.replace(/(<(\w+)[^>]*\sdata-i18n="(\w+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, key, inner, close) => (key in de && de[key] !== '') ? open + esc(de[key]) + close : m);
html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(de.title)}</title>`);

// i18n.js erzeugen
const dict = {};
for (const [l, [name, dir]] of Object.entries(LANGS)) {
  const t = { ...(site.texts[l] || {}), _name: name, _dir: dir };
  site.services.forEach((s, i) => { t[`s${i + 1}t`] = s.title[l] || s.title.de; t[`s${i + 1}d`] = s.text[l] || s.text.de; });
  site.faq.forEach((f, i) => { t[`fq${i + 1}`] = f.q[l] || f.q.de; t[`fa${i + 1}`] = f.a[l] || f.a.de; });
  dict[l] = t;
}
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
fs.writeFileSync('dist/i18n.js', 'window.I18N = ' + JSON.stringify(dict) + ';\n');
fs.cpSync('img', 'dist/img', { recursive: true });
fs.cpSync('admin', 'dist/admin', { recursive: true });
for (const f of ['robots.txt', 'sitemap.xml', 'CNAME']) if (fs.existsSync(f)) fs.copyFileSync(f, path.join('dist', f));
console.log('OK – Website gebaut:', site.services.length, 'Leistungen,', site.faq.length, 'FAQ');
