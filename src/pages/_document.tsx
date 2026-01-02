/**
 * Custom Pages Router document
 *
 * This overrides Next.js default _document page to prevent
 * Html import errors during build on Railway.
 *
 * We're using App Router for the actual app, but Next.js
 * still tries to build default Pages Router pages during static generation.
 */

import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
