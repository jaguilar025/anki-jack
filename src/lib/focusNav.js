// Navegación por teclado entre elementos marcados con `data-nav` dentro de un contenedor.
// El orden de navegación es el orden en el DOM; se omiten los deshabilitados.

function navItems(container) {
  if (!container) return []
  return [...container.querySelectorAll('[data-nav]')].filter(
    (el) => !el.disabled && el.offsetParent !== null,
  )
}

/** ¿El elemento enfocado actualmente es uno de los navegables del contenedor? */
export function isNavFocused(container) {
  return navItems(container).includes(document.activeElement)
}

/**
 * Mueve el foco `delta` posiciones (+1 siguiente, -1 anterior), sin dar la vuelta.
 * Si nada del contenedor tiene foco, enfoca el primero (delta > 0) o el último (delta < 0).
 */
export function moveFocus(container, delta) {
  const items = navItems(container)
  if (items.length === 0) return
  const current = items.indexOf(document.activeElement)
  const next =
    current === -1
      ? delta > 0
        ? 0
        : items.length - 1
      : Math.min(items.length - 1, Math.max(0, current + delta))
  items[next].focus()
}

/** Enfoca el primer elemento navegable del contenedor. */
export function focusFirst(container) {
  navItems(container)[0]?.focus()
}
