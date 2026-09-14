# Development rules for this repository

This project uses the Spotify Web API. These rules are binding for all work here.

- **OpenAPI spec:** Refer to the Spotify OpenAPI specification at
  <https://developer.spotify.com/reference/web-api/open-api-schema.yaml> for all
  endpoint paths, parameters, and response schemas. **Do not guess endpoints or field
  names.** If the spec is unreachable, stop and say so rather than working from
  memory.
- **Authorization:** Use the
  [Authorization Code with PKCE flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
  for any user-specific data. If the app has a secure backend, the
  [Authorization Code flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
  is also acceptable. Only use Client Credentials for public, non-user data. Never use
  the Implicit Grant flow — it is deprecated.
- **Redirect URIs:** Always use HTTPS redirect URIs, except `http://127.0.0.1` for
  local development. Never use `http://localhost` or wildcard URIs. See the
  [redirect URI requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).
- **Scopes:** Request only the minimum
  [scopes](https://developer.spotify.com/documentation/web-api/concepts/scopes) needed
  for the features being built. Do not request broad scopes preemptively.
- **Token management:** Store tokens securely. Never expose the Client Secret in
  client-side code. Implement
  [token refresh](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens)
  logic, and send the user through authorization again when a refresh token expires.
- **Rate limits:** Implement exponential backoff and respect the `Retry-After` header
  on HTTP 429. Do not retry immediately or in tight loops.
- **Deprecated endpoints:** Do not use deprecated endpoints. Prefer
  `/playlists/{id}/items` over `/playlists/{id}/tracks`, and `/me/library` over the
  type-specific library endpoints.
- **Error handling:** Handle all HTTP error codes documented in the OpenAPI schema.
  Read the returned error message and use it to give the user meaningful feedback.
- **Developer Terms of Service:** Comply with the
  [Spotify Developer Terms](https://developer.spotify.com/terms). In particular: do
  not cache Spotify content beyond what is needed for immediate use, always attribute
  content to Spotify, and do not use the API to train machine learning models on
  Spotify data.

## Network access

Building here requires reading the OpenAPI schema, so the session's environment must
allow egress to `developer.spotify.com`. A session whose network policy blocks it
cannot satisfy rule 1 and should not write API code. Note that a policy change binds
at container creation — it only takes effect in a **new** session.
