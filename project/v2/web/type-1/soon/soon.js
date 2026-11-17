/* Primjer: otvorene su samo Početna, O nama i Kontakt. Ostali linkovi
   ostaju na mjestu, ali umjesto odlaska pokazuju poruku da je stranica u pripremi. */
(function () {
  var OPEN = ['index.html', 'o-nama.html', 'kontakt.html'];
  function isOpen(href) {
    if (!href || href.charAt(0) === '#') return true;
    if (/^(tel:|mailto:)/i.test(href)) return true;
    if (/^https:\/\/www\.google\.com\/maps\//i.test(href)) return true;
    var page = href.split('#')[0].split('?')[0];
    return page === '' || OPEN.indexOf(page) !== -1;
  }

  var toast = document.createElement('div');
  toast.className = 'soon-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = '<b>Ova stranica je u pripremi.</b>' +
    '<span>U ovom primjeru možete pogledati Početnu, O nama i Kontakt.</span>';
  document.body.appendChild(toast);
  var timer;
  function show() {
    toast.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('is-on'); }, 3200);
  }

  document.querySelectorAll('a[href]').forEach(function (a) {
    if (isOpen(a.getAttribute('href'))) return;
    a.classList.add('is-soon');
    a.setAttribute('aria-disabled', 'true');
    a.removeAttribute('target');
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.is-soon');
    if (!a) return;
    e.preventDefault();
    show();
  });
})();
