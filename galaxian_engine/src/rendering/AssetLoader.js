export class AssetLoader {

  constructor() {
    this._images = {};
    this._sounds = {};
    this._loaded = false;
    this._loadPromise = null;
  }

  async loadAll() {
    if (this._loadPromise) return this._loadPromise;
    this._loadPromise = this._doLoad();
    return this._loadPromise;
  }

  async _doLoad() {
    const imgPromises = [];
    const imgManifest = [
      { key: 'spriteSheet', path: 'assets/img/Arcade - Galaxian - Miscellaneous - General Sprites.png' },
    ];

    for (const entry of imgManifest) {
      imgPromises.push(this._loadImage(entry.key, entry.path));
    }

    await Promise.all(imgPromises);
    this._loaded = true;
  }

  _loadImage(key, path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this._images[key] = img;
        resolve();
      };
      img.onerror = () => {
        console.warn(`AssetLoader: could not load "${path}" — using fallback`);
        resolve();
      };
      img.src = path;
    });
  }

  getImage(key) {
    return this._images[key] || null;
  }

  get loaded() { return this._loaded; }

}
