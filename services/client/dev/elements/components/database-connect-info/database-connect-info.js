import { LitElement } from 'lit';
import {render, styles} from "./database-connect-info.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-r.js';
import 'prismjs/components/prism-yaml.js';

import ConnectExamples from '../../../../../lib/connect-examples.js';
import IdGenerator from '../../../utils/IdGenerator.js';

export default class DatabaseConnectInfo  extends Mixin(LitElement)
.with(LitCorkUtils) {

  static get properties() {
    return {
      db: { type: Object },
      connectionType: { type: String, attribute: 'connection-type' },
      _exampleCode: { state: true}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.db = {};
    this.connectionType = '';

    this.examples = new ConnectExamples();
    this.idGen = new IdGenerator({randomPrefix: true});

    this._exampleCode = '';
  }

  willUpdate(props){
    if ( props.has('db')) {
      this.setExampleOptions();
      this.setExampleCode();
    } else if ( props.has('connectionType') ){
      this.setExampleCode();
    }
  }

  setExampleOptions(){
    const opts = {};
    if ( this.db?.name ){
      opts.database = `${this.db?.organization?.name}/${this.db.name}`;
    }
    this.examples.setOpts(opts);
  }

  setExampleCode(){
    if( !this.connectionType ) {
      this._exampleCode = '';
      return;
    }
    const lang = this.examples.getPrismLang(this.connectionType);
    const code = this.examples.getTemplate(this.connectionType).replace(/^\n/, '');
    try {
      this._exampleCode = Prism.highlight(code, Prism.languages[lang], lang);
    } catch(e) {
      this.logger.warn('Failed to highlight code', e);
      this._exampleCode = code;
    }
  }

}

customElements.define('database-connect-info', DatabaseConnectInfo);
