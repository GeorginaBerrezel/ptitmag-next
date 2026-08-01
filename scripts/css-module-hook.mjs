/**
 * Hook Node : les imports `*.module.css` renvoient un proxy
 * (classe CSS = nom de la clé). Pour les tests hors Next.
 */
export async function load(url, context, nextLoad) {
  if (url.endsWith('.css') || url.includes('.css?')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'const s = new Proxy({}, { get: (_, key) => (typeof key === "string" ? key : undefined) }); export default s;',
    }
  }
  return nextLoad(url, context)
}
