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

## 3D galaxy background
- `scene3d.js` draws the galaxy (Three.js is included offline in `vendor/three.min.js`, MIT license):
  spiral galaxies, twinkling stars, nebula clouds, planets and shooting stars.
- `fx3d.js` adds the 3D scroll reveal, card tilt and hero depth effects.
- Dark mode = deep-space galaxy. Light mode = soft pastel galaxy.
- The scene turns itself off on very low-power devices or when WebGL is unavailable
  (a CSS star background is shown instead). "Reduce motion" users get a still scene.

## Space-portal hero
- The glowing black hole at the top is pure CSS (`.hero-portal` in `style.css`).
- The orbiting tech icons are in `index.html` inside `.image-container` (two copies: `.orbit-back` behind the photo,
  `.orbit-front` in front). To change an icon, edit the `<i class="fab fa-...">` in BOTH copies.
- Colours: change `--accent-primary` / `--accent-gradient` in the "Space-portal look" block at the end of `style.css`.
