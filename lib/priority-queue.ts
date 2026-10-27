/** Indexed binary min-heap: one entry per vertex, with decrease-key support. */
export class MinHeap {
  private items: number[] = [];
  private positions = new Map<number, number>();

  constructor(private less: (a: number, b: number) => boolean) {}

  get size() {
    return this.items.length;
  }
  values() {
    return [...this.items];
  }

  private swap(a: number, b: number) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    this.positions.set(this.items[a], a);
    this.positions.set(this.items[b], b);
  }

  upsert(vertex: number) {
    let index = this.positions.get(vertex);
    if (index === undefined) {
      index = this.items.length;
      this.items.push(vertex);
      this.positions.set(vertex, index);
    }
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.less(this.items[index], this.items[parent])) break;
      this.swap(index, parent);
      index = parent;
    }
  }

  pop(): number {
    if (!this.size) throw new Error("Cannot extract from an empty heap");
    const result = this.items[0];
    const last = this.items.pop()!;
    this.positions.delete(result);
    if (this.size) {
      this.items[0] = last;
      this.positions.set(last, 0);
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (
          left < this.size &&
          this.less(this.items[left], this.items[smallest])
        )
          smallest = left;
        if (
          right < this.size &&
          this.less(this.items[right], this.items[smallest])
        )
          smallest = right;
        if (smallest === index) break;
        this.swap(index, smallest);
        index = smallest;
      }
    }
    return result;
  }
}
