/**
 * How a playlist comes out.
 *
 * The bug these are written against: every playlist arrived in the same order,
 * because `search` breaks a tie on the title and a whole band's worth of tracks
 * ties on everything else. Two hundred songs by one group therefore played
 * alphabetically, from the same song, every single time — a cassette.
 *
 * So the two things that matter here are that a pile of songs is a permutation
 * of what went in (nothing lost, nothing doubled) and that an album is left
 * alone: shuffling a record somebody sequenced is the opposite bug.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { albumOrder, helpingOnly, shuffled } from '../plugins/audio-player/library.mjs';

/** A track as `readTracks` hands one over. */
function track(path, { title, artist = '', album = '', trackNo = 0 } = {}) {
  return { path, title: title ?? path.split('/').pop(), artist, album, trackNo, tagged: true };
}

const ten = Array.from({ length: 10 }, (_, at) => track(`/music/Band/song ${at}.mp3`, { artist: 'Band' }));

test('shuffled keeps every track exactly once', () => {
  const order = shuffled(ten);
  assert.equal(order.length, ten.length);
  assert.deepEqual(new Set(order), new Set(ten));
});

test('shuffled leaves the gathered order alone', () => {
  const before = [...ten];
  shuffled(ten);
  assert.deepEqual(ten, before);
});

test('shuffled actually reorders', () => {
  // A permutation can come back identical by chance — 1 in 10! per draw — so
  // this fails only if twenty draws in a row do, which is not chance.
  const drawn = Array.from({ length: 20 }, () => shuffled(ten).map((item) => item.path).join('|'));
  assert.ok(new Set(drawn).size > 1, 'twenty draws all came out the same');
});

test('shuffled copes with an empty queue and a single track', () => {
  assert.deepEqual(shuffled([]), []);
  assert.deepEqual(shuffled([ten[0]]), [ten[0]]);
});

test('albumOrder puts one tagged album in its recorded order', () => {
  const record = [
    track('/music/Band/Album/Yesterday.mp3', { album: 'Album', trackNo: 3 }),
    track('/music/Band/Album/Anthem.mp3', { album: 'Album', trackNo: 1 }),
    track('/music/Band/Album/Middle.mp3', { album: 'Album', trackNo: 2 }),
  ];
  assert.deepEqual(
    albumOrder(record).map((item) => item.trackNo),
    [1, 2, 3],
  );
});

test('albumOrder falls back to the file names a ripper wrote', () => {
  const record = [
    track('/music/Band/Album/10 - Ten.mp3', { album: 'Album' }),
    track('/music/Band/Album/02 - Two.mp3', { album: 'Album' }),
    track('/music/Band/Album/01 - One.mp3', { album: 'Album' }),
  ];
  assert.deepEqual(
    albumOrder(record).map((item) => item.title),
    ['01 - One.mp3', '02 - Two.mp3', '10 - Ten.mp3'],
  );
});

test('albumOrder puts numbered tracks ahead of unnumbered ones', () => {
  const record = [
    track('/music/Band/Album/hidden.mp3', { album: 'Album' }),
    track('/music/Band/Album/opener.mp3', { album: 'Album', trackNo: 1 }),
  ];
  assert.deepEqual(
    albumOrder(record).map((item) => item.title),
    ['opener.mp3', 'hidden.mp3'],
  );
});

test('albumOrder refuses a set spanning several albums', () => {
  const across = [
    track('/music/Band/One/a.mp3', { album: 'One', trackNo: 1 }),
    track('/music/Band/Two/b.mp3', { album: 'Two', trackNo: 1 }),
  ];
  assert.equal(albumOrder(across), null);
});

test('albumOrder refuses two records that happen to share a name', () => {
  const collision = [
    track('/music/Band/Greatest Hits/a.mp3', { album: 'Greatest Hits', trackNo: 1 }),
    track('/music/Other/Greatest Hits/b.mp3', { album: 'Greatest Hits', trackNo: 2 }),
  ];
  assert.equal(albumOrder(collision), null);
});

test('albumOrder refuses loose files with no album at all', () => {
  assert.equal(albumOrder(ten), null);
});

test('albumOrder keeps a compilation with a different artist on every line', () => {
  const soundtrack = [
    track('/music/Soundtrack/b.mp3', { album: 'Soundtrack', artist: 'Second', trackNo: 2 }),
    track('/music/Soundtrack/a.mp3', { album: 'Soundtrack', artist: 'First', trackNo: 1 }),
  ];
  assert.deepEqual(
    albumOrder(soundtrack).map((item) => item.artist),
    ['First', 'Second'],
  );
});

test('albumOrder has nothing to say about a single track', () => {
  assert.equal(albumOrder([ten[0]]), null);
});

/**
 * A helping rather than a name.
 *
 * The second bug: "make a playlist of 5 random songs" reached the player as a
 * search for `random 5`, nothing in the library is called that, and a library
 * of eleven Pearl Jam tracks came back as having no playlist to build. These
 * pin down the line between a helping and a name — because getting it wrong the
 * other way is worse: a real band read as a helping plays the wrong music
 * silently, where a helping read as a name only says it found nothing.
 */

test('helpingOnly reads a count out of a helping', () => {
  assert.deepEqual(helpingOnly('random 5'), { count: 5 });
  assert.deepEqual(helpingOnly('5 songs'), { count: 5 });
  assert.deepEqual(helpingOnly('12 random tracks'), { count: 12 });
});

test('helpingOnly counts a number that was written out', () => {
  assert.deepEqual(helpingOnly('five random songs'), { count: 5 });
  assert.deepEqual(helpingOnly('ten tracks'), { count: 10 });
});

test('helpingOnly reads a helping with no count as all of it', () => {
  assert.deepEqual(helpingOnly('something'), { count: 0 });
  assert.deepEqual(helpingOnly('any band'), { count: 0 });
  assert.deepEqual(helpingOnly('some random music'), { count: 0 });
  assert.deepEqual(helpingOnly('surprise me'), { count: 0 });
});

test('helpingOnly refuses anything that could be a name', () => {
  assert.equal(helpingOnly('pearl jam'), null);
  assert.equal(helpingOnly('random order'), null, 'Random Order is a band before it is an instruction');
  assert.equal(helpingOnly('the black keys'), null);
  assert.equal(helpingOnly('random access memories'), null);
});

test('helpingOnly refuses a bare number, which names a song as often as it counts one', () => {
  assert.equal(helpingOnly('1979'), null);
  assert.equal(helpingOnly('99'), null);
});

test('helpingOnly refuses two counts and an impossible one', () => {
  assert.equal(helpingOnly('5 10 songs'), null);
  assert.equal(helpingOnly('0 songs'), null);
  assert.equal(helpingOnly('99999 songs'), null);
});

test('helpingOnly has nothing to say about an empty request', () => {
  assert.equal(helpingOnly(''), null);
  assert.equal(helpingOnly('   '), null);
  assert.equal(helpingOnly(null), null);
});
