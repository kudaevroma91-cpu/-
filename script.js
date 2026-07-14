const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const map = (value, inMin, inMax, outMin = 0, outMax = 1) => {
  const progress = clamp((value - inMin) / Math.max(.0001, inMax - inMin));
  return lerp(outMin, outMax, progress);
};

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileLayout = matchMedia('(max-width: 700px)');
const header = document.querySelector('[data-header]');
const folderStory = document.querySelector('[data-folder-story]');
const folderVideo = document.querySelector('[data-folder-video]');
const folderMedia = document.querySelector('[data-folder-media]');
const heroCopy = document.querySelector('[data-hero-copy]');
const folderFinish = document.querySelector('[data-folder-finish]');
const folderProgress = document.querySelector('[data-folder-progress]');
const scrollCue = document.querySelector('[data-scroll-cue]');
const attentionStory = document.querySelector('[data-attention-story]');
const attentionVideo = document.querySelector('[data-attention-video]');
const attentionCopies = [...document.querySelectorAll('[data-attention-copy]')];
const attentionProgress = document.querySelector('[data-attention-progress]');

const createVideoScrubber = (video, maxDuration = Infinity) => {
  if (!video) return () => {};

  let duration = 0;
  let targetTime = 0;
  let renderedTime = 0;
  let frame = 0;

  const render = () => {
    if (!duration || reducedMotion) {
      frame = 0;
      return;
    }

    renderedTime += (targetTime - renderedTime) * .16;

    if (!video.seeking && Math.abs(video.currentTime - renderedTime) > .028) {
      try { video.currentTime = renderedTime; } catch (_) { /* Metadata may still be loading */ }
    }

    if (Math.abs(targetTime - renderedTime) > .002 || video.seeking) {
      frame = requestAnimationFrame(render);
    } else {
      renderedTime = targetTime;
      if (!video.seeking) video.currentTime = targetTime;
      frame = 0;
    }
  };

  const wake = () => {
    duration = Number.isFinite(video.duration) ? Math.min(video.duration, maxDuration) : 0;
    video.pause();
    renderedTime = clamp(video.currentTime, 0, duration || 0);
    if (reducedMotion && duration) video.currentTime = Math.min(duration, .05);
  };

  video.addEventListener('loadedmetadata', wake);
  video.addEventListener('durationchange', wake);
  video.load();

  return (progress) => {
    if (!duration || reducedMotion) return;
    targetTime = clamp(progress) * Math.max(0, duration - .035);
    if (!frame) frame = requestAnimationFrame(render);
  };
};

const scrubFolderVideo = createVideoScrubber(folderVideo);
const scrubAttentionVideo = createVideoScrubber(attentionVideo, 3);

const sectionProgress = (section) => {
  if (!section) return 0;
  const rect = section.getBoundingClientRect();
  const available = Math.max(1, section.offsetHeight - innerHeight);
  return clamp(-rect.top / available);
};

const setAttentionCopy = (element, opacity) => {
  if (!element) return;
  const visible = clamp(opacity);
  element.style.opacity = visible;
  element.style.transform = `translate3d(0, ${lerp(34, 0, visible).toFixed(1)}px, 0)`;
  element.classList.toggle('is-active', visible > .5);
};

const updateFolderStory = () => {
  if (!folderStory) return;
  const progress = sectionProgress(folderStory);

  if (mobileLayout.matches) {
    const heroOpacity = map(progress, .62, .92, 1, 0);
    heroCopy.style.opacity = heroOpacity;
    heroCopy.style.transform = `translate3d(0, ${lerp(0, -26, 1 - heroOpacity).toFixed(1)}px, 0)`;
  } else {
    scrubFolderVideo(progress);
    const heroOpacity = map(progress, .08, .34, 1, 0);
    heroCopy.style.opacity = heroOpacity;
    heroCopy.style.transform = `translate3d(0, ${lerp(0, -22, 1 - heroOpacity).toFixed(1)}px, 0)`;

    const finishOpacity = map(progress, .65, .86);
    folderFinish.style.opacity = finishOpacity;
    folderFinish.style.transform = `translate3d(0, ${lerp(30, 0, finishOpacity).toFixed(1)}px, 0)`;
    folderMedia.style.transform = `scale(${lerp(1.01, 1.025, progress).toFixed(4)})`;
  }

  scrollCue.style.opacity = map(progress, .06, .26, 1, 0);
  folderProgress.style.transform = `scaleY(${progress})`;
};

const updateAttentionStory = () => {
  if (!attentionStory) return;
  const progress = sectionProgress(attentionStory);
  scrubAttentionVideo(progress);

  const first = 1 - map(progress, .22, .31);
  const second = map(progress, .34, .42) * (1 - map(progress, .51, .59));
  const third = map(progress, .64, .73);

  setAttentionCopy(attentionCopies[0], first);
  setAttentionCopy(attentionCopies[1], second);
  setAttentionCopy(attentionCopies[2], third);
  attentionProgress.style.transform = `scaleX(${progress})`;
};

const updateHeaderTone = () => {
  const dark = [...document.querySelectorAll('.dark-section')].some((section) => {
    const rect = section.getBoundingClientRect();
    const probe = Math.min(90, innerHeight * .12);
    return rect.top <= probe && rect.bottom > probe;
  });
  header?.classList.toggle('is-dark', dark);
};

let ticking = false;
const updatePage = () => {
  ticking = false;
  updateFolderStory();
  updateAttentionStory();
  updateHeaderTone();
};

const requestUpdate = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updatePage);
};

addEventListener('scroll', requestUpdate, { passive: true });
addEventListener('resize', requestUpdate);
mobileLayout.addEventListener?.('change', requestUpdate);
updatePage();

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: .12, rootMargin: '0px 0px -6% 0px' });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

document.querySelector('[data-to-top]')?.addEventListener('click', () => {
  scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
});

const cookieNotice = document.querySelector('[data-cookie-notice]');
const cookieAccept = document.querySelector('[data-cookie-accept]');
let cookieAccepted = false;

try {
  cookieAccepted = localStorage.getItem('cookie-notice-accepted-v1') === 'yes';
} catch (_) { /* The site still works when storage is disabled */ }

if (cookieNotice && !cookieAccepted) {
  cookieNotice.hidden = false;
  requestAnimationFrame(() => cookieNotice.classList.add('is-visible'));
}

cookieAccept?.addEventListener('click', () => {
  cookieNotice.classList.remove('is-visible');
  try { localStorage.setItem('cookie-notice-accepted-v1', 'yes'); } catch (_) { /* Storage may be disabled */ }
  setTimeout(() => { cookieNotice.hidden = true; }, reducedMotion ? 0 : 300);
});

if (matchMedia('(pointer: fine)').matches && !reducedMotion) {
  const cursor = document.querySelector('.cursor-dot');
  let pointerX = -80;
  let pointerY = -80;
  let cursorX = -80;
  let cursorY = -80;

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
