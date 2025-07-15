const express = require("express");
const router = express.Router();
const multer = require('multer');

const {documentTypeCtrl, documentUploadCtrl} = require("../controllers/documentCtrl");

// Configure Multer with better error handling
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1,
        fields: 3
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('application/') || file.mimetype.startsWith('image/') || file.mimetype.startsWith('text/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

router.get("/types", documentTypeCtrl);
router.post('/upload', upload.single('file'), documentUploadCtrl);
module.exports = router;
