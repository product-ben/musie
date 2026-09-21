/**
 * Brand constants.
 *
 * Not copy, so not in the locale catalogues: a brand name does not translate,
 * and putting it there would invite someone to translate it.
 *
 * `Logo`'s own `alt` default is 'Musy', which the prototype contradicts — its
 * wordmark reads "Musie". PROTOTYPE-USAGE.md logs the mismatch. The app passes
 * `alt` explicitly rather than taking the default, which is the same rule the
 * locale catalogues state for every other component string.
 */
export const BRAND_NAME = 'Musie';

/**
 * The mark, as a bare path.
 *
 * `Logo` is the component for the mark AS A LOGO, and it is what the header
 * uses. The onboarding avatar is a different thing: a circle of accent fill
 * with the mark inside it at 60% of the circle, which would mean reaching into
 * `.musy-logo__mark`'s own geometry to resize it — exactly what L7 forbids.
 * The prototype does not use `.musy-logo` there either; it drops a bare `<img>`
 * into the badge.
 *
 * So the path is declared once, here, beside the name it belongs to, rather
 * than written into a screen. It is the same file `Logo` defaults to, and the
 * leading slash matters for the reason `trackUrl` used to document (it was
 * deleted in E.4, when the audio moved to a signed bucket URL): the app
 * serves `public/assets/**` at `/assets/**`, and a document-relative URL would
 * resolve against whatever route is showing.
 */
export const BRAND_MARK_SRC = '/assets/web/musy-logo.png';
