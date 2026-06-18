export class MinPriorityQueue {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  push(item, priority) {
    this.items.push({ item, priority });
    this.#bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    if (this.items.length === 1) return this.items.pop();

    const min = this.items[0];
    this.items[0] = this.items.pop();
    this.#sinkDown(0);
    return min;
  }

  #bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].priority <= this.items[index].priority) break;
      this.#swap(parent, index);
      index = parent;
    }
  }

  #sinkDown(index) {
    while (true) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;

      if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) smallest = left;
      if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) smallest = right;
      if (smallest === index) break;

      this.#swap(index, smallest);
      index = smallest;
    }
  }

  #swap(a, b) {
    const temp = this.items[a];
    this.items[a] = this.items[b];
    this.items[b] = temp;
  }
}
