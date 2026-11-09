import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins:[tailwindcss()],
  server:{watch:{ignored:['**/docs/**','**/tests/**','**/dist/**','**/web-dist/**','**/m0/**','**/*.md','**/deploy/**','**/release/**','**/Dockerfile','**/compose.yaml','.dockerignore']}},
  build:{outDir:'web-dist'},
});
