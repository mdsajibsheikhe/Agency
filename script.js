/* ================= NAV ================= */
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const menu = document.getElementById('menu');

window.addEventListener('scroll', () => {
  nav.classList.toggle('stuck', window.scrollY > 10);
});

burger.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
});

menu.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    menu.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  })
);

/* ================= CONTACT FORM (Formspree) ================= */
const form = document.getElementById('contactForm');
const note = document.getElementById('formMsg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = form.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error('bad response');

    note.hidden = false;
    note.className = 'form-note ok';
    note.textContent = 'Thanks — your enquiry has been sent. We reply within 24 hours.';
    form.reset();
  } catch {
    note.hidden = false;
    note.className = 'form-note err';
    note.textContent = 'Something went wrong. Please try again or email us directly.';
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});

/* ================= FOOTER YEAR ================= */
document.getElementById('year').textContent = new Date().getFullYear();

/* ================= SCROLL REVEAL ================= */
const targets = document.querySelectorAll(
  '.head, .srv, .case, .person, .steps li, .details, .form, .stats li'
);

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 4) * 60}ms`;
    io.observe(el);
  });
}
