# wasteland-plugin-audio-player

Music for [Wasteland Next](https://github.com/alexbeatnik/WastelandNext): a folder of files on your machine, the tag
readers that make sense of them, and a transport in the chat window.

Point it at a directory and ask for something. The model can start a song, build a playlist, skip and pause — and when
several files could be what you meant, you get a list to click rather than a guess.

## What it adds

| Action | What it does |
| --- | --- |
| `play_music` | Starts something — a track, an artist, an album, or whatever was meant by a phrase. |
| `queue_music` | Adds to what is already playing instead of replacing it. |
| `music_control` | Pause, resume, skip, stop, volume. |

## Tags, read here

`tags.mjs` reads ID3v2 and Vorbis comments out of MP3, FLAC, Ogg and Opus, so the plugin knows who performed a track
even when the file name does not say. A plugin cannot have `node_modules` — the app imports it by path — so this is
written out rather than borrowed from `music-metadata`, and that is exactly why it is tested: a binary parser that
mis-reads a frame does not throw, it puts a wrong artist on screen.

## Order, and the lack of it

A playlist gathered from more than one album is shuffled, so a band does not come out alphabetically every time. An
album keeps the order it was sequenced in — track numbers are read for this, and a record that was made to be heard in
sequence is heard in sequence. `library.mjs` holds both halves and `tests/playlist.test.mjs` pins them.

## A helping, not a name

"Five random songs", "something", "any band" — none of those is the name of anything, so searching the library for them
found nothing and the answer came back as *there is no playlist to build*, in front of a library that was full.
`helpingOnly` reads those words as what they are: how many, drawn how, out of everything. It is consulted only after a
search has already failed, so a band actually called Random Order still plays when the library holds one, and any word
it does not recognise is treated as a name — which is the safe way round.

## Settings

**Music folder** — the directory scanned. Changing it rescans, which is what `ctx.onSettingsChanged` is for here;
nothing else would notice.

It is also drawn as a **MUSIC** section in the left panel, because a music folder is changed far more often than it is
decided about, and reaching it through PLUGINS meant finding one row among a dozen.

## Publishing

**A push to `main` publishes.** [The workflow](.github/workflows/release.yml) runs the tests, packs
`plugins/audio-player/` into `audio-player-<version>.zip`, uploads it to the rolling release tagged `plugins`, commits
a regenerated [`index.json`](index.json) naming the archive and its SHA-256, and takes the superseded archives off.

The app reads that index from `main` and refuses to install anything whose bytes do not match the published checksum,
so an archive uploaded by hand with no regenerated index is invisible. To release, bump `version` in
[`plugins/audio-player/plugin.json`](plugins/audio-player/plugin.json) and push.

## Locally

```sh
npm test
npm run index -- --base-url=https://github.com/alexbeatnik/wasteland-plugin-audio-player/releases/download/plugins
```

Plain Node, no dependencies. `npm run index` packs the plugin and writes `index.json` — the same two commands the
workflow runs, so a local run tells you what a push would produce.

## Licence

Apache 2.0, same as the app.
