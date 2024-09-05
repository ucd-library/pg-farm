import yaml from 'js-yaml';

class Print {
  display(payload, format, textPrint) {

    if( payload.error ) {
      let status = payload?.response?.status;

      if( payload.message && status ) {
        payload = {status, message: payload.payload.message};
      }

      if( format === 'json' ) {
        this.json(payload);
      } else {
        this.yaml(payload);
      }
      return;

    }
    
    if( payload.payload ) {
      payload = payload.payload;
    }

    if( format === 'json' ) {
      this.json(payload);
    } else if( format === 'yaml' || !textPrint ) {
      this.yaml(payload);
    } else {
      textPrint(payload);
    }
  }

  json(data) {
    console.log(JSON.stringify(data, null, 2));
  }

  yaml(data) {
    console.log(yaml.dump(data));
  }

  database(db) {
    console.log(`Name: ${db.organization.name}/${db.name}`);
    console.log(`Title: ${db.title}`);
  }
}

const print = new Print();
export default print;