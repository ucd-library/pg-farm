import {Router} from 'express';
import {organization} from '../../../../models/index.js';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';
import crypto from 'crypto';

const router = Router();

router.get('/search', search);
router.post('/search', search);
async function search(req, res) {
  try {
    let input = Object.assign({}, req.query, req.body);
    let opts = {};

    if( input.onlyMine && req.user ) {
      opts.user = req.user.username || req.user.preferred_username;
    }

    let result = await organization.search(opts);
    return res.status(200).json(result);
  } catch(e) {
    handleError(res, e);
  }
}

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

router.get('/:organization/logo', async (req, res) => {
  try {
    let org = await organization.get(req.params.organization, ['logo_file_type', 'logo', 'updated_at', 'name']);

    if (!org.logo) {
      res.status(404).send('Not found');
      return;
    }

    // Ensure file type is valid
    const fileType = org.logo_file_type || 'image/png';
    const fileExtension = fileType.split('/').pop() || 'png';

    // File name
    const fileName = `${org.name ? org.name + '-logo' : 'logo'}.${fileExtension}`;

    // Compute ETag as a hash of the file contents
    const eTag = crypto.createHash('md5').update(org.logo).digest('hex');

    // Handle caching
    res.set('Content-Type', fileType);
    res.set('Content-Length', Buffer.byteLength(org.logo));
    res.set('Accept-Ranges', 'bytes');
    res.set('Content-Disposition', `inline; filename="${fileName}"`);
    res.set('Cache-Control', 'public, max-age=31557600');
    res.set('Last-Modified', new Date(org.updated_at).toUTCString());
    res.set('ETag', eTag);

    // Handle conditional caching
    if (req.headers['if-none-match'] === eTag) {
      res.status(304).end();
      return;
    }

    res.status(200).send(Buffer.from(org.logo));
  } catch (e) {
    res.status(404).send('Not found');
  }
});


export default router;
