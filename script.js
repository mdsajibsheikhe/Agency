// ===== Navbar scroll effect =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// ===== Mobile menu =====
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');

menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => navLinks.classList.remove('open'))
);

// ===== Contact form (Formspree) =====
const form = document.getElementById('contactForm');
const formMsg = document.getElementById('formMsg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = form.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      formMsg.hidden = false;
      formMsg.className = 'form-msg';
      formMsg.textContent = '✅ Thank you! Your message has been sent.';
      form.reset();
    } else {
      throw new Error('failed');
    }
  } catch {
    formMsg.hidden = false;
    formMsg.className = 'form-msg err';
    formMsg.textContent = '❌ Could not send — please try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Message';
  }
});

// ===== Footer year =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== Reveal on scroll =====
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = 1;
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('.card, .section-head').forEach((el) => {
  el.style.opacity = 0;
  el.style.transform = 'translateY(28px)';
  el.style.transition = 'opacity .6s ease, transform .6s ease';
  observer.observe(el);
});
