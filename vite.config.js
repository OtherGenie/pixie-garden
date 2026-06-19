import { defineConfig } from 'vite'

// `base` is set so the same build works at a GitHub Pages sub-path
// (https://<user>.github.io/pixie-garden/) and locally. Override with
// PIXIE_BASE if the repo is named differently or served from root.
export default defineConfig({
  base: process.env.PIXIE_BASE ?? './',
})
