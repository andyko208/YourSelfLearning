import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'activeTab', 'tabs'],
    web_accessible_resources: [{
      resources: ['lessons/how-to-control.tsv'],
      matches: ['<all_urls>']
    }]
  }
});
