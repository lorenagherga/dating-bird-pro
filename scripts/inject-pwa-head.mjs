import { readFileSync, writeFileSync } from 'node:fs';

const indexPath = new URL('../dist/index.html', import.meta.url);
const html = readFileSync(indexPath, 'utf8');

const headTags = `
    <meta name="description" content="Gestionează-ți porumbeii, pedigree-urile, competițiile și crescătoria dintr-o singură aplicație." />
    <meta name="theme-color" content="#0F2A6B" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Pigeon Fan" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" href="/icon-192.png" type="image/png" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(() => {});
        });
      }
    </script>
  </head>`;

if (html.includes('rel="manifest"')) {
  process.exit(0);
}

writeFileSync(indexPath, html.replace('</head>', `${headTags}`));
