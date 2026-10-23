import { test } from 'node:test';
import assert from 'node:assert/strict';
import { externalLinks, ratingBadges, ratingValue } from '../src/logic/ratings.ts';

test('rating values by scale', () => {
  assert.equal(ratingValue({ source: 'imdb', value: 8.5, max: 10 }), '8.5');
  assert.equal(ratingValue({ source: 'tmdb', value: 8, max: 10 }), '8');
  assert.equal(ratingValue({ source: 'tmdb', value: 7.849, max: 10 }), '7.8');
  assert.equal(ratingValue({ source: 'rotten_tomatoes', value: 93, max: 100 }), '93%');
  assert.equal(ratingValue({ source: 'anilist', value: 90.6, max: 100 }), '91%');
  assert.equal(ratingValue({ source: 'metacritic', value: 73, max: 100 }), '73');
  assert.equal(ratingValue({ source: 'other', value: 4.5, max: 5 }), '4.5/5');
});

test('badges are labelled, ordered and filtered', () => {
  const badges = ratingBadges([
    { source: 'rotten_tomatoes', value: 96, max: 100 },
    { source: 'imdb', value: 9.5, max: 10 },
    { source: 'tmdb', value: 8.9, max: 10 },
    { source: 'metacritic', value: Number.NaN, max: 100 },
    { source: 'anidb', value: 8.12, max: 10 },
  ]);
  assert.deepEqual(
    badges.map((b) => `${b.label} ${b.value}`),
    ['TMDB 8.9', 'IMDb 9.5', 'RT 96%', 'AniDB 8.1'],
  );
});

test('external links per kind', () => {
  const ids = { tmdb: '1396', imdb: 'tt0903747', tvdb: '81189', anidb: null, anilist: '21' };
  assert.deepEqual(
    externalLinks('series', ids).map((l) => l.url),
    [
      'https://www.themoviedb.org/tv/1396',
      'https://www.imdb.com/title/tt0903747/',
      'https://thetvdb.com/dereferrer/series/81189',
      'https://anilist.co/anime/21',
    ],
  );
  assert.equal(externalLinks('movie', { tmdb: '603' })[0]?.url, 'https://www.themoviedb.org/movie/603');
  assert.deepEqual(
    externalLinks('episode', ids).map((l) => l.label),
    ['IMDb'],
  );
  assert.deepEqual(externalLinks('movie', {}), []);
});
