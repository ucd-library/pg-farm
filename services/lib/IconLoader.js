import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

/**
 * @description Load icons from FontAwesome or custom icons from the filesystem
 */
export default class IconLoader {
  constructor(opts){
    this.faNodeModulePath = opts?.faNodeModulePath || '/services/node_modules/@fortawesome/fontawesome-free';
    this.faNodeModuleSvgsPath = path.join(this.faNodeModulePath, 'svgs');
    this.customIconPath = opts?.customIconPath || '/services/administration/src/controllers/api/icon/svgs';
    this.faPrefix = opts?.faPrefix || 'fa';

    let svgs = [];
    this._crawlFiles(this.faNodeModuleSvgsPath, svgs);
    this._crawlFiles(this.customIconPath, svgs);
    this.svgs = svgs;
  }

  get faMetadata() {
    if ( this._faMetadata ) {
      return this._faMetadata;
    }
    const file = path.join(this.faNodeModulePath, 'metadata', 'icons.yml');
    this._faMetadata = yaml.load(fs.readFileSync(file, 'utf-8'));
    return this._faMetadata;
  }

  search(searchTerm, limit=10, allowBrands=false) {
    let re = new RegExp(searchTerm.replace(/[^a-zA-Z]/g, ''), 'i');
    let resp = [];

    for( let icon of this.svgs ) {
      if( allowBrands === false && icon.type === 'brands' ) continue;
      if ( !(re.test(icon.token) || icon?.searchTerms?.some(term => re.test(term))) ) {
        continue;
      }

      resp.push({
        label: icon.label,
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
        const isFa = fullPath.startsWith(this.faNodeModulePath);
        const noExt = file.replace('.svg', '');
        const label = isFa ? this.faMetadata?.[noExt]?.label || noExt : noExt;
        svgs.push({
          label,
          token: noExt.replace(/[^a-zA-Z]/g, ''),
          name: file,
          isFa,
          searchTerms: isFa ? this.faMetadata?.[noExt]?.search?.terms || [] : [],
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
