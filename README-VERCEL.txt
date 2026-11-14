# Tin SeaMing Portfolio

This is a static HTML/CSS/JavaScript portfolio prepared for Vercel.

## Deploy to Vercel
1. Extract this ZIP.
2. Upload the extracted project to your GitHub repository (the `index.html`, `style.css`, `script.js`, image file, and `images` folder must be at the repository root).
3. In Vercel, open Project Settings -> General -> Root Directory and set it to `./`.
4. Set Framework Preset to `Other`. No build command is required. Set the output directory to `.` if Vercel asks for one.
5. Redeploy from Deployments.

Do not upload `node_modules` or `.git`.

## Your CV
The "Download CV" buttons download `cv/Tin_SeaMing_CV.pdf`. The file included is a simple
starter CV built from the text on this website. Replace it with your real CV and keep the
same file name (`cv/Tin_SeaMing_CV.pdf`) and the buttons will keep working.

## Extra design + smooth motion
- Theme switch uses a circular wipe from the toggle button (View Transitions API, with a plain fade as fallback).
- Menu has a sliding highlight; buttons are magnetic; a soft light follows the cursor (desktop, mouse only).
- Scroll progress bar (top), back-to-top button, count-up numbers, tech strip (marquee) under the hero, footer.
- Section labels ("01 · About" ...) are `<span class="eyebrow">` elements in `index.html`.
- Light mode shares the purple/blue identity: edit the `html[data-theme="light"]` block near the end of `style.css`.

## Aurora design (current)
- `scene3d.js` draws the aurora background with plain WebGL (no libraries needed): flowing northern-light curtains and
  glowing fireflies; twinkling stars are two light canvases it creates. Dark mode = night aurora, light mode = sunrise aurora.
  It reacts to scroll and mouse, turns itself off on very low-power devices / without WebGL (a CSS star background shows instead),
  and stays still when the visitor has "reduce motion" on.
- `fx3d.js` adds the 3D scroll reveal, card tilt, orbiting-icon tilt, sliding menu highlight, magnetic buttons, cursor glow, counters.
- Fonts: headings use Sora (self-hosted in `fonts/`, SIL Open Font License); body text uses Inter.
- Colours: edit the variables at the start of the "AURORA redesign" block at the end of `style.css`
  (`--accent-gradient`, `--accent-primary`, and the `html[data-theme="light"]` copy for light mode).
- Aurora colours themselves are in the `pal()` function inside `scene3d.js`.

