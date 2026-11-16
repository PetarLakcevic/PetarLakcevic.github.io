// English is the default: the markup is English and each translated element
// carries its Montenegrin text in data-sr.
const translations = [...document.querySelectorAll('[data-sr]')];
translations.forEach(el => el.dataset.en = el.innerHTML);
let language = 'en';
let activeDialog = null;
const content = {
  about: {
    sr: '<h2>Iskustvo koje nas pokreće.</h2><p>Vezuv je osnovan 1999. godine. Razvoj kompanije zasniva se na unapređivanju usluga, novim idejama i ljudima koji ih ostvaruju.</p><h3>Naše vrijednosti</h3><p>Inicijativa da pronađemo bolje rješenje. Hrabrost da preuzmemo odgovornost. Uzajamnost koja stavlja tim i zajednički rezultat u prvi plan.</p><h3>Pogled u budućnost</h3><p>Razvijamo poslovanje uz poštovanje onoga što smo izgradili: ljudi, povjerenja i odnosa sa zajednicom.</p><a class="text-link" href="https://vezuv.me/about-us" target="_blank" rel="noopener">Više o kompaniji na vezuv.me ↗</a>',
    en: '<h2>Experience that moves us forward.</h2><p>Founded in 1999, Vezuv has developed through better services, new ideas and the people who bring them to life.</p><h3>Our values</h3><p>The initiative to find a better solution. The courage to take responsibility. A collaborative spirit that puts the team and shared results first.</p><h3>Looking ahead</h3><p>We develop our business while respecting what we have built: our people, trust and relationships with the community.</p><a class="text-link" href="https://vezuv.me/about-us" target="_blank" rel="noopener">More about the company on vezuv.me ↗</a>'
  },
  responsible: {
    sr: '<h2>Odgovorno igranje.</h2><p>Igre na sreću su namijenjene isključivo punoljetnim osobama. Igranje treba da ostane oblik zabave, u okviru ličnih granica.</p><ul><li>Unaprijed odredite koliko vremena i novca možete da izdvojite.</li><li>Ne pokušavajte da igranjem nadoknadite gubitke.</li><li>Napravite pauzu ako igranje prestane da bude zabava.</li></ul><p>Za informacije o dostupnim mjerama zaštite i podršci, obratite se priređivaču preko zvaničnih kontakt kanala.</p><a class="text-link" href="https://vezuv.me/contact" target="_blank" rel="noopener">Zvanični kontakt ↗</a>',
    en: '<h2>Responsible gaming.</h2><p>Gambling is for adults only. It should remain a form of entertainment within personal limits.</p><ul><li>Decide in advance how much time and money you can afford to spend.</li><li>Do not gamble to recover losses.</li><li>Take a break if gambling stops being enjoyable.</li></ul><p>For information about available safeguards and support, contact the operator through its official contact channels.</p><a class="text-link" href="https://vezuv.me/contact" target="_blank" rel="noopener">Official contact information ↗</a>'
  },
  notice: {
    sr: '<h2>Koncept novog sajta.</h2><p>Ovo je prijedlog vizuelnog i sadržajnog redizajna korporativnog sajta Vezuv. Osvježeni logotip koristi geometriju originalnog znaka. Fotografije i podaci preuzeti su sa zvaničnog sajta vezuv.me. Naslovi i tekstovi prilagođeni su novom dizajnu.</p><p>Novosti prikazuju datume objave na izvornom sajtu. Linkovi ka detaljnim informacijama otvaraju zvanični sajt. Ovaj koncept nije platforma za igre na sreću.</p><p>Verzija za pregled · novembar 2026.</p>',
    en: '<h2>A new website concept.</h2><p>This is a proposed visual and editorial redesign of Vezuv’s corporate website. The refreshed logo preserves the original mark’s geometry. Photography and company information are sourced from vezuv.me. Headlines and copy have been adapted for this design.</p><p>News items retain their original publication dates. Detailed information links open the official website. This concept is not a gambling platform.</p><p>Review version · November 2026.</p>'
  }
};
const dialog = document.querySelector('#info-dialog');
function renderDialog(){ dialog.querySelector('.dialog-body').innerHTML = content[activeDialog][language]; }
document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
  language = button.dataset.lang;
  document.documentElement.lang = language === 'sr' ? 'sr-Latn' : 'en';
  translations.forEach(el => el.innerHTML = el.dataset[language]);
  document.querySelectorAll('[data-lang]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.lang === language)));
  document.querySelector('.menu-toggle').setAttribute('aria-label', language === 'sr' ? 'Otvori meni' : 'Open menu');
  document.querySelector('.close-dialog').setAttribute('aria-label', language === 'sr' ? 'Zatvori' : 'Close');
  document.querySelector('.back-top').setAttribute('aria-label', language === 'sr' ? 'Nazad na vrh' : 'Back to top');
  document.querySelector('.brand').setAttribute('aria-label', language === 'sr' ? 'Vezuv — početna' : 'Vezuv — home');
  document.querySelector('.navrow nav').setAttribute('aria-label', language === 'sr' ? 'Glavna navigacija' : 'Main navigation');
  document.querySelector('#mobile-menu').setAttribute('aria-label', language === 'sr' ? 'Mobilna navigacija' : 'Mobile navigation');
  document.title = language === 'sr' ? 'Vezuv — Snaga iskustva. Energija budućnosti.' : 'Vezuv — Built on experience. Driven by tomorrow.';
  if(activeDialog) renderDialog();
}));
document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => {
  activeDialog = button.dataset.dialog;
  renderDialog();
  dialog.setAttribute('aria-label', dialog.querySelector('h2').textContent);
  dialog.showModal();
}));
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if(event.target === dialog){ const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) dialog.close(); }});
dialog.addEventListener('close', () => {activeDialog=null;});
const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
function closeMenu(){mobileMenu.hidden=true;menuButton.setAttribute('aria-expanded','false');}
menuButton.addEventListener('click', () => {const open=menuButton.getAttribute('aria-expanded') !== 'true';menuButton.setAttribute('aria-expanded', String(open));mobileMenu.hidden=!open;});
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => {if(e.key==='Escape'){closeMenu();}});
matchMedia('(min-width:701px)').addEventListener('change', e => {if(e.matches) closeMenu();});
document.querySelector('#year').textContent = new Date().getFullYear();
