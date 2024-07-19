import {Router} from 'express';
import {database as model, organization} from '../../../../models/index.js';
import handleError from '../handle-errors.js';

const router = Router();

router.get('/', search);
router.post('/', search);

router.get('/metadata/:org/:name', async (req, res) => {
  try {
    res.json(await model.getDatabase(req.params.id));
  } catch(e) {
    handleError(res, e);
  }
});

async function search(req, res) {
  try {
    let input = Object.assign({}, req.query, req.body);

    let opts = {
      text : input.text,
      tags : input.tags,
      organization : input.organization,
      limit : input.limit || 10,
      offset : input.offset || 0
    };

    if( input.onlyMine && req.user ) {
      opts.user = req.user.id;
    }

    let result = await model.search(opts);
    result.items = result.items.map(db => {
      let result = {
        id : db.database_id,
        name : db.database_name,
        title : db.database_title || '',
        short_description : db.database_short_description || '',
        description : db.database_description || '',
        tags : db.database_tags ? db.database_tags.split(',') : [],
        url : db.database_url || '',
        organization : null,
        state : db.instance_state,
      }

      if( db.organization_id ) {
        result.organization = {
          id : db.organization_id,
          name : db.organization_name,
          title : db.organization_title
        }
      }

      return result;
    });

    res.json(result);
  } catch(e) {
    handleError(res, e);
  }
}

export default router;