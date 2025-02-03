import { Router } from 'express';
import handleError from '../../handle-errors.js';
import IconLoader from '../../../../../lib/IconLoader.js';

const iconLoader = new IconLoader();

const router = Router();

router.get('/search/:term', async (req, res) => {
  try {
    const icons = iconLoader.search(req.params.term);
    res.json(icons);
  } catch (e) {
    handleError(res, e);
  }
});

router.get('/batch/:icons', async (req, res) => {
  try {
    const icons = req.params.icons.split(',');
    const svgs = iconLoader.get(...icons);
    res.json(svgs);
  } catch (e) {
    handleError(res, e);
  }
});


export default router;
