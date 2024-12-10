import path from 'path';
import fs from 'fs';

/**
 * @description Load icons from FontAwesome or custom icons from the filesystem
 */
export default class IconLoader {
  constructor(opts){
    this.faNodeModulePath = opts?.faNodeModulePath || '/services/node_modules/@fortawesome/fontawesome-free/svgs';
    this.customIconPath = opts?.customIconPath || '/services/administration/src/controllers/api/icon/svgs';
    this.faPrefix = opts?.faPrefix || 'fa';

    this.svgs = {};
  }

  /**
   * @description Get svgs for the given icon slugs
   * @param  {String} iconSlugs - The icon slugs to load from the filesystem
   * dots are used to separate directories
   * If the icon slug starts with 'fa.', the icon will be loaded from the FontAwesome
   * so the slug 'fa.solid.address-book' will load the FontAwesome icon 'address-book.svg' from the solid icon set
   * @returns {Object} - An object with the icon slugs as keys and the svgs as values
   */
  get(...iconSlugs){
    const out = {};

    iconSlugs.forEach(slug => {
      if (this.svgs[slug]) {
        out[slug] = this.svgs[slug];
        return;
      }

      const iconSlugArray = this._getIconSlugArray(slug);
      if ( !iconSlugArray.length ) return;
      if ( iconSlugArray[0] === this.faPrefix ) {
        iconSlugArray.shift();
        this.svgs[slug] =  this._readIconFile(iconSlugArray, this.faNodeModulePath);
      } else {
        this.svgs[slug] = this._readIconFile(iconSlugArray, this.customIconPath);
      }
      out[slug] = this.svgs[slug];

    });
    return out;
  }

  _getIconSlugArray(iconSlug){
    const iconSlugArray = iconSlug
      .split('.')
      .map(x => x.replaceAll('/', ''))
      .map(x => x);
    return iconSlugArray;
  }

  _readIconFile(slugArray, basePath){
    if ( !slugArray.length || !basePath ) return;

    slugArray[slugArray.length - 1] = slugArray[slugArray.length - 1] + '.svg';
    const iconPath = path.join(basePath, ...slugArray );
    const resolvedPath = path.resolve(iconPath);

    // ensure we stay within the basePath
    if (!resolvedPath.startsWith(path.resolve(basePath))) {
      return;
    }

    if ( ! fs.existsSync(resolvedPath) ) {return;}

    const icon = fs.readFileSync(resolvedPath, 'utf-8');
    return icon;
  }
}
