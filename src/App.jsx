import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { ALBUM_COVER, tracks } from './tracks';
import { buildThemeStyles, extractTopTwoColors } from './colorFromCover';
import './App.css';

function getTrackUrl(track) {
  if (track.youtube) return track.youtube;
  if (track.url) return track.url;
  return null;
}

function formatTime(seconds) {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 정지 상태는 흰 원, 재생 중에는 흰색 진행률 원 + 흰색 일시정지 */
function PlayPauseButton({ playing, progress }) {
  const maskId = useId().replace(/:/g, '');
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - Math.min(Math.max(progress, 0), 1));

  if (playing) {
    return (
      <svg className="play-btn-svg" width="56" height="56" viewBox="0 0 56 56" aria-hidden>
        <circle
          className="progress-track"
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="3.2"
        />
        <circle
          className="progress-ring"
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
        />
        <rect x="20" y="17" width="6" height="22" rx="2.2" fill="#ffffff" />
        <rect x="30" y="17" width="6" height="22" rx="2.2" fill="#ffffff" />
      </svg>
    );
  }

  return (
    <svg className="play-btn-svg" width="56" height="56" viewBox="0 0 56 56" aria-hidden>
      <defs>
        <mask id={maskId}>
          <rect width="56" height="56" fill="black" />
          <circle cx="28" cy="28" r="28" fill="white" />
          <path d="M20 17Q20 14.8 21.8 15.9L40.5 27Q42.15 28 40.5 29L21.8 40.1Q20 41.2 20 39V17z" fill="black" />
        </mask>
      </defs>
      <rect width="56" height="56" fill="#ffffff" mask={`url(#${maskId})`} />
    </svg>
  );
}

/** 일자와 삼각형 꼭짓점이 닿는 스포티파이식 넘김 버튼 */
function IconPrev() {
  return (
    <svg className="icon-skip" viewBox="0 0 24 24" fill="#ffffff" aria-hidden>
      <rect x="5.5" y="5.5" width="3.2" height="13" rx="1" />
      <path d="M7.8 12L16.95 6Q18.5 5.05 18.5 6.8V17.2Q18.5 18.95 16.95 18L7.8 12z" />
    </svg>
  );
}

function IconNext() {
  return (
    <svg className="icon-skip" viewBox="0 0 24 24" fill="#ffffff" aria-hidden>
      <rect x="15.3" y="5.5" width="3.2" height="13" rx="1" />
      <path d="M16.2 12L7.05 18Q5.5 18.95 5.5 17.2V6.8Q5.5 5.05 7.05 6L16.2 12z" />
    </svg>
  );
}

function IconPlaySmall() {
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 6.4Q8 4.8 9.4 5.6L19.2 11.4Q20.2 12 19.2 12.6L9.4 18.4Q8 19.2 8 17.6V6.4z" />
    </svg>
  );
}

function IconPauseSmall() {
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="7.2" y="5.5" width="3.8" height="13" rx="1.2" />
      <rect x="13" y="5.5" width="3.8" height="13" rx="1.2" />
    </svg>
  );
}

function OverflowMarquee({ text }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const title = textRef.current;
      if (!container || !title) return;
      setIsOverflowing(title.scrollWidth > container.clientWidth + 1);
    };

    measure();
    const frame = requestAnimationFrame(measure);
    if (typeof ResizeObserver === 'undefined') {
      return () => cancelAnimationFrame(frame);
    }

    const resizeObserver = new ResizeObserver(measure);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (textRef.current) resizeObserver.observe(textRef.current);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [text]);

  return (
    <span
      className={`track-title-scroll${isOverflowing ? ' is-overflowing' : ''}`}
      ref={containerRef}
      title={text}
    >
      <span className="track-title-scroll-inner">
        <span className="track-title-scroll-text" ref={textRef}>
          {text}
        </span>
        {isOverflowing && (
          <span className="track-title-scroll-text track-title-scroll-duplicate" aria-hidden>
            {text}
          </span>
        )}
      </span>
    </span>
  );
}

function isInsideEmbeddedFrame() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

const EMBED_MINI_HEIGHT = 364;

function getViewportHeight() {
  return window.innerHeight || document.documentElement.clientHeight || 0;
}

function getInitialViewMode(query) {
  const queryMode = query.get('mode');
  if (queryMode === 'mini' || queryMode === 'normal') return queryMode;
  if (query.get('embed') === 'true' || isInsideEmbeddedFrame()) {
    return getViewportHeight() <= EMBED_MINI_HEIGHT ? 'mini' : 'normal';
  }
  return 'normal';
}

export default function App() {
  const playerRef = useRef(null);
  const trackListRef = useRef(null);
  const scrollbarRef = useRef(null);
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const queryMode = query.get('mode');
  const isEmbed = useMemo(() => query.get('embed') === 'true' || isInsideEmbeddedFrame(), [query]);
  const [viewportHeight, setViewportHeight] = useState(getViewportHeight);
  const [viewMode, setViewMode] = useState(() => getInitialViewMode(query));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [durationCache, setDurationCache] = useState({});
  const [scrollbar, setScrollbar] = useState({ top: 0, height: 0, visible: false });
  const coverRef = useRef(null);
  const [themeStyle, setThemeStyle] = useState(() =>
    buildThemeStyles({
      primary: [120, 165, 210],
      secondary: [80, 130, 185],
    }),
  );

  const applyCoverTheme = useCallback((img) => {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const colors = extractTopTwoColors(img);
    setThemeStyle(buildThemeStyles(colors));
  }, []);

  const currentTrack = tracks[currentIndex];
  const currentUrl = useMemo(() => getTrackUrl(currentTrack), [currentTrack]);
  const effectiveViewMode =
    isEmbed && queryMode !== 'mini' && queryMode !== 'normal'
      ? viewportHeight <= EMBED_MINI_HEIGHT
        ? 'mini'
        : 'normal'
      : viewMode;
  const previousViewModeRef = useRef(effectiveViewMode);
  const [isLayoutChanging, setIsLayoutChanging] = useState(false);

  const handleCoverLoad = useCallback(
    (e) => {
      applyCoverTheme(e.currentTarget);
    },
    [applyCoverTheme],
  );

  useEffect(() => {
    if (coverRef.current) {
      applyCoverTheme(coverRef.current);
    }
  }, [ALBUM_COVER, applyCoverTheme]);

  useEffect(() => {
    if (!isEmbed || queryMode === 'mini' || queryMode === 'normal') return undefined;

    const updateViewportHeight = () => setViewportHeight(getViewportHeight());
    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    return () => window.removeEventListener('resize', updateViewportHeight);
  }, [isEmbed, queryMode]);

  useEffect(() => {
    if (previousViewModeRef.current === effectiveViewMode) return undefined;

    previousViewModeRef.current = effectiveViewMode;
    setIsLayoutChanging(true);
    const timeout = window.setTimeout(() => setIsLayoutChanging(false), 280);
    return () => window.clearTimeout(timeout);
  }, [effectiveViewMode]);

  useEffect(() => {
    setPlayedSeconds(0);
    setTotalSeconds(durationCache[currentIndex] ?? 0);
  }, [currentIndex, currentUrl, durationCache]);

  const remainingSeconds = Math.max(0, totalSeconds - playedSeconds);
  const playProgress = totalSeconds > 0 ? playedSeconds / totalSeconds : 0;

  const getDurationLabel = useCallback(
    (idx) => {
      const sec = durationCache[idx];
      if (sec > 0) return formatTime(sec);
      if (idx === currentIndex && totalSeconds > 0) return formatTime(totalSeconds);
      return tracks[idx].duration ?? '—';
    },
    [durationCache, currentIndex, totalSeconds],
  );

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % tracks.length);
    setPlaying(true);
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length);
    setPlaying(true);
  }, []);

  const selectTrack = useCallback((idx) => {
    setCurrentIndex(idx);
    setPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (!getTrackUrl(tracks[currentIndex])) return;
    setPlaying((p) => !p);
  }, [currentIndex]);

  const handleDuration = useCallback(
    (duration) => {
      if (!duration || Number.isNaN(duration)) return;
      setTotalSeconds(duration);
      setDurationCache((prev) => ({ ...prev, [currentIndex]: duration }));
    },
    [currentIndex],
  );

  const updateScrollbar = useCallback(() => {
    const el = trackListRef.current;
    const bar = scrollbarRef.current;
    if (!el) return;

    const { clientHeight, scrollHeight, scrollTop } = el;
    if (scrollHeight <= clientHeight) {
      setScrollbar({ top: 0, height: 0, visible: false });
      return;
    }

    const trackHeight = bar?.clientHeight || clientHeight;
    const height = Math.max(36, (clientHeight / scrollHeight) * trackHeight);
    const maxTop = trackHeight - height;
    const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop;
    setScrollbar({ top, height, visible: true });
  }, []);

  useEffect(() => {
    updateScrollbar();
    const el = trackListRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const resizeObserver = new ResizeObserver(updateScrollbar);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [updateScrollbar, effectiveViewMode, tracks.length]);

  const D = 'div';

  return (
    <D className="page">
      {!isEmbed && (
        <D className="view-toggle" aria-label="플레이어 보기 전환">
          <button
            type="button"
            className={viewMode === 'normal' ? 'active' : ''}
            onClick={() => setViewMode('normal')}
          >
            Normal
          </button>
          <button
            type="button"
            className={viewMode === 'mini' ? 'active' : ''}
            onClick={() => setViewMode('mini')}
          >
            Mini
          </button>
        </D>
      )}

      <D
        className={`player-card${isEmbed ? ' embed' : ''}${effectiveViewMode === 'mini' ? ' mini' : ''}${isLayoutChanging ? ' is-layout-changing' : ''}`}
        style={themeStyle}
      >
        <section className="player-hero" aria-label="현재 재생">
          <D className="hero-main">
            <img
              ref={coverRef}
              className="cover"
              src={ALBUM_COVER}
              alt="앨범 커버"
              onLoad={handleCoverLoad}
            />
            <D className="now-playing-info">
              <h1 className="now-playing-title">{currentTrack.title}</h1>
              <p className="now-playing-artist">{currentTrack.artist}</p>
            </D>
          </D>

          <D className="hero-controls">
            <D className="skip-controls">
              <button type="button" className="skip-btn" onClick={goPrev} aria-label="이전 곡">
                <IconPrev />
              </button>
              <button type="button" className="skip-btn" onClick={goNext} aria-label="다음 곡">
                <IconNext />
              </button>
            </D>
            <button
              type="button"
              className="play-btn"
              onClick={togglePlay}
              aria-label={playing ? '일시정지' : '재생'}
            >
              <PlayPauseButton playing={playing} progress={playProgress} />
            </button>
          </D>
        </section>

        <section className="player-playlist" aria-label="플레이리스트">
          <D className="track-list" role="list" ref={trackListRef} onScroll={updateScrollbar}>
            {tracks.map((track, idx) => {
              const active = idx === currentIndex;
              return (
                <D
                  key={`${track.title}-${idx}`}
                  role="listitem"
                  className={`track-row${active ? ' active' : ''}`}
                  onClick={() => selectTrack(idx)}
                >
                  <D className="track-index" aria-hidden>
                    {active ? playing ? <IconPauseSmall /> : <IconPlaySmall /> : idx + 1}
                  </D>
                  <D className="track-main">
                    <D className="track-title-line">
                      {active ? <OverflowMarquee text={track.title} /> : <span>{track.title}</span>}
                      <span className="track-artist-inline">· {track.artist}</span>
                      {track.new && <span className="badge badge-new">New</span>}
                      {track.explicit && <span className="badge badge-explicit">Explicit</span>}
                    </D>
                    <p className="track-subline">{track.artist}</p>
                  </D>
                  <D className="track-duration">{getDurationLabel(idx)}</D>
                </D>
              );
            })}
          </D>
          <D
            className={`custom-scrollbar${scrollbar.visible ? '' : ' hidden'}`}
            ref={scrollbarRef}
            aria-hidden
          >
            <D
              className="custom-scrollbar-thumb"
              style={{
                height: `${scrollbar.height}px`,
                transform: `translateY(${scrollbar.top}px)`,
              }}
            />
          </D>
        </section>

        {currentUrl ? (
          <D className="hidden-player" aria-hidden>
            <ReactPlayer
              ref={playerRef}
              url={currentUrl}
              playing={playing}
              volume={0.85}
              muted={false}
              width="200"
              height="200"
              progressInterval={250}
              onEnded={goNext}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onProgress={({ playedSeconds: played }) => setPlayedSeconds(played)}
              onDuration={handleDuration}
              config={{
                youtube: {
                  playerVars: { modestbranding: 1, rel: 0 },
                },
              }}
            />
          </D>
        ) : null}
      </D>
    </D>
  );
}
