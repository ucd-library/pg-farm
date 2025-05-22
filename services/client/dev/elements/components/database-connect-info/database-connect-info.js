import { LitElement } from 'lit';
import {render, styles} from "./database-connect-info.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-r.js';
import 'prismjs/components/prism-yaml.js';
import {config} from '../../../../../../tools/lib/config.js';

import { ConnectExamples } from '@ucd-lib/pgfarm-client/utils/service-lib.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';

export default class DatabaseConnectInfo  extends Mixin(LitElement)
.with(LitCorkUtils) {

  static get properties() {
    return {
      db: { type: Object },
      connectionType: { type: String, attribute: 'connection-type' },
      selectedUser: { type: String },
      userTypes: { type: Array },
      swaggerUrl: { type: String },
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
    this.connectionType = 'python';
    
    this.selectedUser = 'public';
    this.userTypes = ['public'];
    this.isLoggedIn = false; 
    this._initUser();

    this.examples = new ConnectExamples();
    this.idGen = new IdGenerator({randomPrefix: true});

    this._exampleCode = '';
  }

  async _initUser() {
    this.user = await config.getUser();
    if( this.user?.loggedIn ) {
      this.isLoggedIn = true;
      this.userTypes.unshift('you');
      this.selectedUser = 'you';
    }
  }


  willUpdate(props){
    if ( props.has('db') || props.has('selectedUser') ) {
      this.setExampleOptions();
      this.setExampleCode();
    } else if ( props.has('connectionType') ) {
      this.setExampleCode();
    }
  }

  setExampleOptions(){
    const opts = {
      host: window.location.hostname
    };
    
    if ( this.db?.name ){
      opts.database = `${this.db?.organization?.name || '_'}/${this.db.name}`;
    }

    if ( this.selectedUser === 'you' ) {
      opts.user = this.user.preferred_username;
    } else {
      opts.user = window.APP_CONFIG.publicUser.username;
      opts.password = window.APP_CONFIG.publicUser.password;
    }

    this.swaggerUrl = window.location.origin +
      window.APP_CONFIG.swaggerUi.basePath +
      '?url=' + 
      encodeURIComponent(
        (APP_CONFIG.swaggerUi.testingDomain || window.location.origin) + 
        '/api/query/' +
        opts.database
      );
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
