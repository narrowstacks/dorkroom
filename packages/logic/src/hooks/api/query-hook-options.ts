/** Options shared by the catalog query hooks. */
export interface QueryHookOptions {
  /**
   * When false the query waits (no request) until it turns true, as for a
   * page that fetches the catalog only once someone starts searching.
   * Defaults to true.
   */
  enabled?: boolean;
}
