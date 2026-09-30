// Proteção contra extensões do navegador (tradutor do Chrome, corretores...)
// que trocam o texto da página por elementos próprios. Quando o React tenta
// tirar ou inserir um nó que a extensão já moveu, o navegador lança erro e a
// tela inteira cai ("This page didn't load"). Aqui a operação inválida é
// ignorada — a tela segue funcionando. Solução conhecida da issue
// facebook/react#11538.
let installed = false;

export function installDomGuard() {
  if (installed || typeof Node === "undefined") return;
  installed = true;

  const removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child) as T;
  };

  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    node: T,
    reference: Node | null,
  ): T {
    if (reference && reference.parentNode !== this) return node;
    return insertBefore.call(this, node, reference) as T;
  };
}
