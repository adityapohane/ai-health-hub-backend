const express = require('express');
const router = express.Router();


const { addressByZip } = require('./generalController');

router.get('/addressByZip', addressByZip);

module.exports = router;
