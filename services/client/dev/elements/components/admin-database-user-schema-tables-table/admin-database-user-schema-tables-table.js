import { LitElement } from 'lit';
import {render, styles} from "./admin-database-user-schema-tables-table.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import TableController from '@ucd-lib/pgfarm-client/controllers/TableController.js';
import { grantDefinitions } from '@ucd-lib/pgfarm-client/utils/service-lib.js';

export default class AdminDatabaseUserSchemaTablesTable extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      tables: {type: Array},
      bulkActions: {type: Array},
      selectedBulkAction: {type: String}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.tables = [];
    this.bulkActions = grantDefinitions.getObjectGrants('TABLE').map(grant => {
      return {
        label: grant.roleLabel,
        value: grant.action
      }
    })
  }

}

customElements.define('admin-database-user-schema-tables-table', AdminDatabaseUserSchemaTablesTable);
