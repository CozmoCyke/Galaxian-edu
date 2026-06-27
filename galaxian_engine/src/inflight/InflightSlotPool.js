const SLOT_COUNT = 8;
const RESERVED = 4;
const SLOT_AUX = 0;
const SLOT_FLAGSHIP = 1;
const SLOT_ESCORT_START = 2;
const SLOT_ORDINARY_START = 4;

export class InflightSlotPool {

  constructor() {
    this.slots = new Array(SLOT_COUNT);
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.slots[i] = { allocated: false, slotIndex: i };
    }
  }

  get total() { return SLOT_COUNT; }
  get reserved() { return RESERVED; }

  get allocatedCount() {
    return this.slots.filter(s => s.allocated).length;
  }

  get freeCount() {
    return this.slots.filter(s => !s.allocated).length;
  }

  allocate(slotIndex) {
    if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return null;
    if (this.slots[slotIndex].allocated) return null;
    this.slots[slotIndex].allocated = true;
    return slotIndex;
  }

  allocateNext() {
    for (let i = SLOT_COUNT - 1; i >= SLOT_ORDINARY_START; i--) {
      if (!this.slots[i].allocated) {
        this.slots[i].allocated = true;
        return i;
      }
    }
    return null;
  }

  free(slotIndex) {
    if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return false;
    if (!this.slots[slotIndex].allocated) return false;
    this.slots[slotIndex].allocated = false;
    return true;
  }

  isAllocated(slotIndex) {
    if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return false;
    return this.slots[slotIndex].allocated;
  }

  isReserved(slotIndex) {
    return slotIndex >= 0 && slotIndex < RESERVED;
  }

  canAllocate(slotIndex) {
    if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return false;
    if (this.isReserved(slotIndex)) return false;
    return !this.slots[slotIndex].allocated;
  }

  reset() {
    for (const s of this.slots) {
      s.allocated = false;
    }
  }
}
