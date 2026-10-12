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
  const showNote = (text, ok) => {
    note.hidden = false;
    note.className = 'form-note ' + (ok ? 'ok' : 'err');
    note.textContent = text;
  };

  /* Formspree ID এখনো বসানো হয়নি */
  if (form.action.includes('YOUR_FORM_ID')) {
    showNote('Form is not connected yet — please email us directly.', false);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error('bad response');

    showNote('Thanks — your enquiry has been sent. We reply within 24 hours.', true);
    form.reset();
    document.querySelectorAll('.pick-btn').forEach((x, i) =>
      x.classList.toggle('is-active', i === 1)
    );
  } catch {
    showNote('Something went wrong. Please try again or email us directly.', false);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});

/* ================= FOOTER YEAR ================= */
document.getElementById('year').textContent = new Date().getFullYear();

/* ================= PACKAGE PICKER (contact) ================= */
const budgetSel = document.getElementById('budget');
document.querySelectorAll('.pick-btn').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.pick-btn').forEach((x) => x.classList.remove('is-active'));
    b.classList.add('is-active');
    if (budgetSel) budgetSel.value = b.dataset.budget;
  });
});
if (budgetSel) budgetSel.addEventListener('change', () => {
  document.querySelectorAll('.pick-btn').forEach((x) =>
    x.classList.toggle('is-active', x.dataset.budget === budgetSel.value)
  );
});

/* ================= SCROLL PROGRESS BAR ================= */
const progress = document.getElementById('progress');
const updateProgress = () => {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
};
document.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

/* ================= MARQUEE — duplicate for seamless loop ================= */
const track = document.getElementById('stripTrack');
if (track) track.innerHTML += track.innerHTML;

/* ================= COUNTER ANIMATION (hero stats) ================= */
const animateCount = (el) => {
  const raw = el.dataset.count || el.textContent;
  const match = raw.match(/^([^\d]*)([\d.]+)(.*)$/);
  if (!match) return;
  const [, prefix, numStr, suffix] = match;
  const target = parseFloat(numStr);
  const decimals = numStr.includes('.') ? 1 : 0;
  const duration = 1400;
  const start = performance.now();

  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const statNums = document.querySelectorAll('.stats strong');
statNums.forEach((el) => (el.dataset.count = el.textContent));

if ('IntersectionObserver' in window) {
  const countIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countIO.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  statNums.forEach((el) => countIO.observe(el));
}


/* ================= SCROLL REVEAL ================= */
const targets = document.querySelectorAll(
  '.head, .srv, .case, .person, .steps li, .details, .form, .plan'
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
