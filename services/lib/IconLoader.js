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

    let svgs = [];
    this._crawlFiles(this.faNodeModulePath, svgs);
    this._crawlFiles(this.customIconPath, svgs);
    this.svgs = svgs;
  }

  search(searchTerm, limit=5, allowBrands=false) {
    let re = new RegExp(searchTerm.replace(/[^a-zA-Z]/g, ''), 'i');
    let resp = [];

    for( let icon of this.svgs ) {
      if( allowBrands === false && icon.type === 'brands' ) continue;
      if( !re.test(icon.token) ) continue;

      resp.push({
        name: icon.name,
        isFa: icon.isFa,
        type: icon.type,
        svg: fs.readFileSync(icon.file, 'utf-8')
      });
      if( resp.length >= limit ) {
        break;
      }
    }
    return resp;
  }

  _crawlFiles(dirpath, svgs) {
    const files = fs.readdirSync(dirpath);
    files.forEach(file => {
      const fullPath = path.join(dirpath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        this._crawlFiles(fullPath, svgs);
      } else if( fullPath.endsWith('.svg') ) {
        svgs.push({
          token: file.replace('.svg', '').replace(/[^a-zA-Z]/g, ''),
          name: file,
          isFa: fullPath.startsWith(this.faNodeModulePath),
          type: fullPath.replace(/.*\/([^/]+)\/([^/]+)\.svg/, '$1'),
          file: fullPath
        });
      }
    });
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
      const {isFa, type, name} = this._parseIconSlug(slug);
      const icon = this.svgs.find(icon => {
        return icon.name === name && icon.type === type && icon.isFa === isFa;
      });
      if ( icon ) {
        if ( !icon.svg ) {
          icon.svg = fs.readFileSync(icon.file, 'utf-8');
        }
        out[slug] = icon.svg;
      }
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

  _parseIconSlug(iconSlug){
    const iconSlugArray = iconSlug
    .split('.')
    .map(x => x.replaceAll('/', ''))
    .map(x => x);
    const isFa = iconSlugArray?.[0] === this.faPrefix;
    const type = isFa ? iconSlugArray?.[1] : 'svgs';
    const name = (iconSlugArray?.[iconSlugArray.length - 1] || '') + '.svg';
    return {isFa, type, name};
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
