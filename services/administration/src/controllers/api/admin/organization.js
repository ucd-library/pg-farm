import {Router} from 'express';
import {organization} from '../../../../../models/index.js';
import keycloak from '../../../../../lib/keycloak.js';
import handleError from '../../handle-errors.js';

const router = Router();

router.post('/', keycloak.protect('admin'), async (req, res) => {
  try {
    let org = await organization.create(req.body.title, req.body);
    res.status(201).json(org);
  } catch(e) {
    handleError(res, e);
  }
});

router.patch(
  '/:organization/metadata', 
  keycloak.protect('{organization}-admin'), 
  async (req, res) => {

  try {
    let resp = await organization.setMetadata(
      req.params.organization,
      req.body
    );
    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.put('/:organization/:user/:role', 
  keycloak.protect('{organization}-admin'), 
  async (req, res) => {
  
  try {
    let resp = await organization.setUserRole(
      req.params.organization,
      req.params.user,
      req.params.role
    );
    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

export default router;