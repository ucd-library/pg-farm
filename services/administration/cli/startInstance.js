import adminModel from '../src/models/admin.js';

let [,,template, name] = process.argv;
// let adminModel = new admin();

adminModel.startInstance(name);