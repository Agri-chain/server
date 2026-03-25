import multer from 'multer';

// Use memory storage for Cloudinary upload
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpg, png, gif, webp)'), false);
    }
};

export const uploadAvatar = multer({
    storage: storage,
    limits: {
        fileSize: 7 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});
