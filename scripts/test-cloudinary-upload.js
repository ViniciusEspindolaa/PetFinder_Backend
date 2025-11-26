const dotenv = require('dotenv');
dotenv.config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// 1x1 PNG base64
const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const dataUri = 'data:image/png;base64,' + base64PNG;

(async () => {
  try {
    console.log('Uploading test image to Cloudinary...');
    const res = await cloudinary.uploader.upload(dataUri, {
      folder: 'petfinder/test',
      public_id: `test_${Date.now()}`,
      overwrite: true
    });
    console.log('UPLOAD_OK');
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('UPLOAD_ERR');
    console.error(err);
    process.exit(1);
  }
})();
