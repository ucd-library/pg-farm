import {Router} from 'express';
import config from '../../../lib/config.js';

const router = Router();

router.get('/ca-chain.pem', (req, res) => {
  res.set('Content-Type', 'application/x-pem-file');
  res.send(config.caChainPem);
});

export default router;