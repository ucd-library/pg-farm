import {Router} from 'express';
import {organization} from '../../../../models/index.js';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';

const router = Router();

router.post('/', keycloak.protect('admin'), async (req, res) => {
  try {
    let org = await organization.create(req.body.title, req.body);
    res.status(201).json(org);
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization', async (req, res) => {
  try {
    let org = await organization.get(req.params.organization);
    res.status(200).json(org);
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/users', async (req, res) => {
  try {
    let resp = await organization.getUsers(req.params.organization);

    let users = {};

    resp.forEach(user => {
      if( user.user_type === 'PGREST' ) return;

      if( !users[user.username] ) {
        users[user.username] = {
          username : user.username,
          isAdmin : false,
          instances : []
        };
      }
      users[user.username].instances.push({
        name: user.instance_name,
        databases: user.databases,
        role : user.user_type
      });
      if( user.user_type === 'ADMIN' ) {
        users[user.username].isAdmin = true;
      }
    });

    res.status(200).json(Object.values(users));
  } catch(e) {
    handleError(res, e);
  }
});

router.patch(
  '/:organization',
  keycloak.protect('organization-admin'),
  async (req, res) => {

  try {
    let resp = await organization.setMetadata(
      req.params.organization,
      req.body
    );
    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/is-admin', keycloak.protect('organization-admin'), async (req, res) => {
  return res.json({isAdmin: true});
});


export default router;
