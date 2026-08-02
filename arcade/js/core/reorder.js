/**
 * reorder.js — shared helper for the two "put these in order" games
 * (Incident Responder, Patch Priority). Wires up both mouse drag-and-drop
 * and fully keyboard-accessible move-up/move-down buttons on a list, so
 * neither game has to reimplement drag handling twice.
 */

/**
 * Enable HTML5 drag-and-drop reordering on a list container's direct
 * children. Calls onReorder(newOrderIndexes) after a successful drop.
 * @param {HTMLElement} listEl
 * @param {(fromIndex: number, toIndex: number) => void} onReorder
 */
export function enableDragReorder(listEl, onReorder) {
  let dragIndex = null;

  Array.from(listEl.children).forEach((child, i) => {
    child.setAttribute('draggable', 'true');
    child.addEventListener('dragstart', () => {
      dragIndex = i;
      child.classList.add('dragging');
    });
    child.addEventListener('dragend', () => {
      child.classList.remove('dragging');
      dragIndex = null;
    });
    child.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    child.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetIndex = Array.from(listEl.children).indexOf(child);
      if (dragIndex !== null && dragIndex !== targetIndex) {
        onReorder(dragIndex, targetIndex);
      }
    });
  });
}

/**
 * Move an item within an array from one index to another, returning a new array.
 * @param {Array} arr
 * @param {number} from
 * @param {number} to
 */
export function moveItem(arr, from, to) {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
