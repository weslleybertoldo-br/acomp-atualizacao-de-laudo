// Defesa contra Google Translate (e similares) corromperem o DOM.
// Bug conhecido React: https://github.com/facebook/react/issues/11538
// Quando o tradutor substitui text nodes, React tenta insertBefore/removeChild
// em nós cujo parentNode mudou → NotFoundError → tela branca.
// Aqui interceptamos os 2 metodos pra retornar gracefully ao inves de jogar.

export function installTranslatorGuard() {
  if (typeof Node === "undefined" || !Node.prototype) return;
  const w = window as unknown as { __translatorGuardInstalled?: boolean };
  if (w.__translatorGuardInstalled) return;
  w.__translatorGuardInstalled = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        try {
          return originalRemoveChild.call(child.parentNode, child) as T;
        } catch {
          /* noop */
        }
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  } as typeof Node.prototype.removeChild;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      try {
        return originalInsertBefore.call(this, newNode, null) as T;
      } catch {
        return newNode;
      }
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  } as typeof Node.prototype.insertBefore;
}
