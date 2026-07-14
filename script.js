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

const motionDemo = document.querySelector('[data-motion-demo]');
if (motionDemo) {
  const motionStory = document.querySelector('[data-motion-story]');
  const motionSteps = [...document.querySelectorAll('[data-motion-step]')];
  const demoKicker = motionDemo.querySelector('[data-demo-kicker]');
  const demoLineOne = motionDemo.querySelector('[data-demo-line-one]');
  const demoLineTwo = motionDemo.querySelector('[data-demo-line-two]');
  const demoButton = motionDemo.querySelector('[data-demo-button]');
  let activeMotionStep = 0;
  let motionTicking = false;
  let motionSwapTimer = 0;

  const motionObserver = new IntersectionObserver(([entry]) => {
    motionDemo.classList.toggle('is-playing', entry.isIntersecting && !reducedMotion);
  }, { threshold: .28 });
  motionObserver.observe(motionDemo);

  const activateMotionStep = (index) => {
    if (index === activeMotionStep) return;
    activeMotionStep = index;
    motionSteps.forEach((step, stepIndex) => step.classList.toggle('is-active', stepIndex === index));
    const step = motionSteps[index];
    motionDemo.dataset.step = String(index);
    motionDemo.classList.add('is-switching');
    clearTimeout(motionSwapTimer);
    motionSwapTimer = setTimeout(() => {
      demoKicker.textContent = step.dataset.kicker;
      demoLineOne.textContent = step.dataset.lineOne;
      demoLineTwo.textContent = step.dataset.lineTwo;
      demoButton.textContent = step.dataset.button;
      motionDemo.classList.remove('is-switching');
    }, reducedMotion ? 0 : 170);
  };

  const updateMotionStory = () => {
    motionTicking = false;
    if (!motionStory || innerWidth <= 900) return;

    const storyRect = motionStory.getBoundingClientRect();
    const available = Math.max(1, motionStory.offsetHeight - innerHeight);
    const progress = clamp(-storyRect.top / available);
    motionDemo.style.setProperty('--depth-scale', lerp(.92, 1.035, progress).toFixed(4));
    motionDemo.style.setProperty('--depth-y', `${lerp(24, -10, progress).toFixed(1)}px`);

    const anchor = innerHeight * .48;
    let closestIndex = 0;
    let closestDistance = Infinity;
    motionSteps.forEach((step, index) => {
      const rect = step.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height * .48 - anchor);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    activateMotionStep(closestIndex);
  };

  const requestMotionUpdate = () => {
    if (motionTicking) return;
    motionTicking = true;
    requestAnimationFrame(updateMotionStory);
  };

  addEventListener('scroll', requestMotionUpdate, { passive: true });
  addEventListener('resize', requestMotionUpdate);
  updateMotionStory();
}

document.querySelector('[data-to-top]').addEventListener('click', () => {
  scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
});

const cookieNotice = document.querySelector('[data-cookie-notice]');
const cookieAccept = document.querySelector('[data-cookie-accept]');
let cookieNoticeAccepted = false;

try {
  cookieNoticeAccepted = localStorage.getItem('cookie-notice-accepted-v1') === 'yes';
} catch (_) { /* The site still works when storage is disabled. */ }

if (cookieNotice && !cookieNoticeAccepted) {
  cookieNotice.hidden = false;
  requestAnimationFrame(() => cookieNotice.classList.add('is-visible'));
}

cookieAccept?.addEventListener('click', () => {
  cookieNotice.classList.remove('is-visible');
  try { localStorage.setItem('cookie-notice-accepted-v1', 'yes'); } catch (_) { /* Storage may be disabled. */ }
  setTimeout(() => { cookieNotice.hidden = true; }, reducedMotion ? 0 : 350);
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
