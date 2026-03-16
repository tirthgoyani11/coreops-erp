const express = require('express');
const { getDefs, createDef, updateDef, getValues, setValues } = require('../controllers/customFieldController');
const verifyToken = require('../middleware/verifyToken');
const audit = require('../middleware/auditMiddleware');

const router = express.Router();

router.use(verifyToken);

router.route('/defs')
    .get(getDefs)
    .post(audit('CREATE_CUSTOM_FIELD_DEF', 'SETTINGS_RESOURCE'), createDef);

router.route('/defs/:id')
    .put(audit('UPDATE_CUSTOM_FIELD_DEF', 'SETTINGS_RESOURCE'), updateDef);

router.route('/values/:entityId')
    .get(getValues)
    .post(audit('UPDATE_CUSTOM_FIELD_VALUES', 'SETTINGS_RESOURCE'), setValues);

module.exports = router;
