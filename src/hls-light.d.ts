// hls.js ships no types for its light build (no subtitles, alternate audio or DRM, all of which
// Ferrocine does without); its API is the full build's.
declare module 'hls.js/light' {
  export * from 'hls.js';
  export { default } from 'hls.js';
}
