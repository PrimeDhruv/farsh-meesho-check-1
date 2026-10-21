import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built app also works from any static host / sub-folder.
export default defineConfig({ base: './', plugins: [react()] });
