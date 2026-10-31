/** Binary min-heap of [node, cost] pairs, ordered by cost only. Equal costs
 * keep the sift order the Dijkstra searches have always used. */
export class MinHeap {
  private items: [number, number][] = [];
  get length() {
    return this.items.length;
  }
  push(node: number, cost: number) {
    const heap = this.items;
    heap.push([node, cost]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][1] <= cost) break;
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  }
  pop(): [number, number] {
    const heap = this.items,
      first = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      while (true) {
        let child = i * 2 + 1;
        if (child >= heap.length) break;
        if (child + 1 < heap.length && heap[child + 1][1] < heap[child][1])
          child++;
        if (heap[i][1] <= heap[child][1]) break;
        [heap[i], heap[child]] = [heap[child], heap[i]];
        i = child;
      }
    }
    return first;
  }
}
