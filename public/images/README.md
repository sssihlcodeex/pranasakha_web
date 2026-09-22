# /public/images

Drop your hero poster/fallback image here as:

    hero-poster.jpg

Referenced from `src/components/site/Hero.tsx` via the relative path `/images/hero-poster.jpg`.
It is used two ways:
1. As the `poster` frame the `<video>` shows before the video loads.
2. As a full fallback background (with a slow Ken Burns zoom animation) if the
   video file is missing or fails to load — so pick an image that works well
   standalone too, ideally similar in tone/subject to the video.

Recommended specs:
- Format: JPG or WebP
- Resolution: 1920x1080 or larger, landscape
- Under ~400KB (compress with squoosh.app or `cwebp`)

Add any other homepage imagery here as you go (e.g. `institutions/`, `team/`
subfolders) and reference with a plain absolute path like `/images/....`.
