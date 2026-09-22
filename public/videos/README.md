# /public/videos

Drop your hero background video here as:

    hero-background.mp4

Referenced from `src/components/site/Hero.tsx` via the relative path `/videos/hero-background.mp4`.

Recommended specs:
- Format: MP4 (H.264)
- Length: 8–20s, seamlessly loopable (it autoplays on mute + loop)
- Resolution: 1920x1080 is plenty (it's stretched full-bleed with `object-cover`)
- Keep the file under ~8–10MB for fast load — compress with HandBrake or:
  `ffmpeg -i input.mov -vcodec h264 -crf 26 -an hero-background.mp4`
- No audio needed (it's always muted per browser autoplay rules) — `-an` strips it
- Good subject matter: hospital corridors, doctors in consultation, hands/care,
  volunteers at work — nothing with fast cuts or flashing, since text sits on top

If this file is missing, the Hero gracefully falls back to the poster image
in `/public/images/hero-poster.jpg`, and if that's missing too, it falls back
to the brand gradient — so the site never breaks while you're sourcing footage.
