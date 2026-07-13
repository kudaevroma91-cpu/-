const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const map = (value, inMin, inMax, outMin = 0, outMax = 1) => {
  const progress = clamp((value - inMin) / (inMax - inMin));
  return lerp(outMin, outMax, progress);
};

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const archive = document.querySelector('.archive');
const video = document.querySelector('[data-folder-video]');
const shell = document.querySelector('[data-video-shell]');
const intro = document.querySelector('[data-intro]');
const openCopy = document.querySelector('[data-open-copy]');
const scrollHint = document.querySelector('[data-scroll-hint]');
const meter = document.querySelector('[data-meter]');
const header = document.querySelector('[data-header]');

let duration = 0;
let targetTime = 0;
let renderedTime = 0;
let archiveProgress = 0;
let videoAnimationFrame = 0;

const renderVideoSmoothly = () => {
  if (!duration || reducedMotion) {
    videoAnimationFrame = 0;
    return;
  }

  const difference = targetTime - renderedTime;
  renderedTime += difference * .14;

  if (!video.seeking && Math.abs(video.currentTime - renderedTime) > .025) {
    try { video.currentTime = renderedTime; } catch (_) { /* Metadata may still be settling. */ }
  }

  if (Math.abs(difference) > .002 || video.seeking) {
    videoAnimationFrame = requestAnimationFrame(renderVideoSmoothly);
  } else {
    renderedTime = targetTime;
    if (!video.seeking) video.currentTime = targetTime;
    videoAnimationFrame = 0;
  }
};

const requestVideoFrame = () => {
  if (!videoAnimationFrame && duration && !reducedMotion) {
    videoAnimationFrame = requestAnimationFrame(renderVideoSmoothly);
  }
};

const updateArchive = () => {
  const rect = archive.getBoundingClientRect();
  const available = Math.max(1, archive.offsetHeight - innerHeight);
  archiveProgress = clamp(-rect.top / available);

  targetTime = duration * archiveProgress;
  requestVideoFrame();

  const introOut = map(archiveProgress, .08, .38, 1, 0);
  intro.style.opacity = introOut;
  intro.style.transform = `translate3d(0, ${archiveProgress * -18}px, 0)`;

  const openIn = map(archiveProgress, .68, .9);
  openCopy.style.opacity = openIn;
  openCopy.style.transform = `translateY(${lerp(30, 0, openIn)}px)`;

  scrollHint.style.opacity = map(archiveProgress, .02, .18, 1, 0);
  meter.style.transform = `scaleY(${archiveProgress})`;
  header.classList.toggle('is-compact', scrollY > archive.offsetHeight - innerHeight * 1.1);
};

const wakeVideo = () => {
  duration = Number.isFinite(video.duration) ? video.duration : 0;
  video.pause();
  targetTime = duration * archiveProgress;
  renderedTime = targetTime;
  if (duration) video.currentTime = targetTime;
  if (reducedMotion && duration) {
    video.currentTime = duration;
  } else {
    updateArchive();
  }
};

video.addEventListener('loadedmetadata', wakeVideo);
video.addEventListener('durationchange', wakeVideo);
video.addEventListener('canplay', () => document.body.classList.remove('is-loading'), { once: true });
video.load();

let ticking = false;
const requestUpdate = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateArchive();
    ticking = false;
  });
};

addEventListener('scroll', requestUpdate, { passive: true });
addEventListener('resize', requestUpdate);
updateArchive();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: .13, rootMargin: '0px 0px -5% 0px' });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

document.querySelector('[data-to-top]').addEventListener('click', () => {
  scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
});

const briefForm = document.querySelector('[data-brief-form]');
const formSuccess = document.querySelector('[data-form-success]');

briefForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const submitButton = briefForm.querySelector('.form-submit');
  submitButton.disabled = true;
  submitButton.querySelector('span').textContent = 'Форма заполнена';
  formSuccess.hidden = false;
  formSuccess.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
});

const contact = document.querySelector('.contact');
const headerToneObserver = new IntersectionObserver(([entry]) => {
  header.classList.toggle('is-dark', entry.isIntersecting && entry.intersectionRatio > .1 && false);
}, { threshold: [0, .1, .5] });
headerToneObserver.observe(contact);

if (matchMedia('(pointer:fine)').matches && !reducedMotion) {
  const cursor = document.querySelector('.cursor-dot');
  let pointerX = -50;
  let pointerY = -50;
  let cursorX = -50;
  let cursorY = -50;

  addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
  }, { passive: true });

  const moveCursor = () => {
    cursorX += (pointerX - cursorX) * .2;
    cursorY += (pointerY - cursorY) * .2;
    cursor.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
    requestAnimationFrame(moveCursor);
  };
  moveCursor();

  document.querySelectorAll('a, button').forEach((element) => {
    element.addEventListener('mouseenter', () => cursor.classList.add('is-active'));
    element.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
  });
}
