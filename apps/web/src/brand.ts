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
