/** Gradiente CSS do ambiente (index.css, .backdrop-fallback): usado sem canvas 2D ou se um chunk falhar. */
export function Fallback() {
  return <div className="backdrop-fallback absolute inset-0" data-testid="backdrop-fallback" />
}
