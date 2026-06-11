interface HeapEntry<T> {
  item: T
  priority: number
}

export class MinHeap<T> {
  private readonly values: HeapEntry<T>[] = []

  get size(): number {
    return this.values.length
  }

  push(item: T, priority: number): void {
    this.values.push({ item, priority })
    this.bubbleUp(this.values.length - 1)
  }

  pop(): HeapEntry<T> | undefined {
    if (this.values.length === 0) {
      return undefined
    }

    const minimum = this.values[0]
    const last = this.values.pop()

    if (last && this.values.length > 0) {
      this.values[0] = last
      this.sinkDown(0)
    }

    return minimum
  }

  private bubbleUp(index: number): void {
    let childIndex = index

    while (childIndex > 0) {
      const parentIndex = Math.floor((childIndex - 1) / 2)

      if (this.values[parentIndex].priority <= this.values[childIndex].priority) {
        break
      }

      this.swap(parentIndex, childIndex)
      childIndex = parentIndex
    }
  }

  private sinkDown(index: number): void {
    let parentIndex = index

    while (true) {
      const leftIndex = parentIndex * 2 + 1
      const rightIndex = parentIndex * 2 + 2
      let smallestIndex = parentIndex

      if (
        leftIndex < this.values.length &&
        this.values[leftIndex].priority < this.values[smallestIndex].priority
      ) {
        smallestIndex = leftIndex
      }

      if (
        rightIndex < this.values.length &&
        this.values[rightIndex].priority < this.values[smallestIndex].priority
      ) {
        smallestIndex = rightIndex
      }

      if (smallestIndex === parentIndex) {
        break
      }

      this.swap(parentIndex, smallestIndex)
      parentIndex = smallestIndex
    }
  }

  private swap(left: number, right: number): void {
    const temporary = this.values[left]
    this.values[left] = this.values[right]
    this.values[right] = temporary
  }
}
