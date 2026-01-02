/**
 * Custom Pages Router error page
 *
 * This overrides Next.js default _error page to prevent
 * Html import errors during build on Railway.
 *
 * We're using App Router for the actual app, but Next.js
 * still tries to build default Pages Router error pages.
 */

function Error() {
  return null; // Not rendered - App Router error.tsx takes precedence
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode: number } }) => {
  const statusCode = res?.statusCode || err?.statusCode || 404;
  return { statusCode };
};

export default Error;
