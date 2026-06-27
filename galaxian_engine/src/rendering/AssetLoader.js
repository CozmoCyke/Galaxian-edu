export class AssetLoader {

  constructor() {
    this._loaded = false;
  }

  async loadAll() {
    this._loaded = true;
    return Promise.resolve();
  }

  get loaded() { return this._loaded; }

}
