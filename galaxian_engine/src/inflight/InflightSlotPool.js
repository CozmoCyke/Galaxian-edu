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
    return !this.slots[slotIndex].allocated;
  }

  allocateFlagshipSlot() {
    if (this.slots[SLOT_FLAGSHIP].allocated) return null;
    this.slots[SLOT_FLAGSHIP].allocated = true;
    return SLOT_FLAGSHIP;
  }

  allocateEscortSlot() {
    for (let i = SLOT_ESCORT_START; i < SLOT_ORDINARY_START; i++) {
      if (!this.slots[i].allocated) {
        this.slots[i].allocated = true;
        return i;
      }
    }
    return null;
  }

  allocateFlagshipGroup() {
    const flag = this.allocateFlagshipSlot();
    if (!flag) return null;
    const esc1 = this.allocateEscortSlot();
    const esc2 = this.allocateEscortSlot();
    return { flagshipSlot: flag, escortSlots: [esc1, esc2].filter(s => s !== null) };
  }

  freeFlagshipGroup({ escortSlots = [] } = {}) {
    this.free(SLOT_FLAGSHIP);
    for (const s of escortSlots) {
      this.free(s);
    }
  }

  hasFreeFlagshipSlot() {
    return !this.slots[SLOT_FLAGSHIP].allocated;
  }

  hasFreeEscortSlot() {
    for (let i = SLOT_ESCORT_START; i < SLOT_ORDINARY_START; i++) {
      if (!this.slots[i].allocated) return true;
    }
    return false;
  }

  freeEscortSlot() {
    for (let i = SLOT_ESCORT_START; i < SLOT_ORDINARY_START; i++) {
      if (this.slots[i].allocated) {
        this.slots[i].allocated = false;
        return i;
      }
    }
    return null;
  }

  reset() {
    for (const s of this.slots) {
      s.allocated = false;
    }
  }
}
