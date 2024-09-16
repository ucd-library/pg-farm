import {PayloadUtils} from '@ucd-lib/cork-app-utils'

const ID_ORDER = ['org', 'instance', 'db', 'schema', 
  'schemaTable', 'table', 'user', 'action', 'access'];

let inst = new PayloadUtils({
  idParts: ID_ORDER,
  customKeyFormat : {
    org : val => val || '_',
  }
});
export default inst;