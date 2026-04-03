require('dotenv').config();
const { ImageKit } = require('@imagekit/nodejs');

// Lazy singleton — only initialized when first used
let _ik = null;

const getIK = () => {
  if (_ik) return _ik;
  if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
    throw new Error('ImageKit env vars not set (IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT)');
  }
  _ik = new ImageKit({
    publicKey:   process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey:  process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
  return _ik;
};

/**
 * Upload a file buffer to ImageKit
 * @returns {{ url, fileId, thumbnail }}
 */
const uploadFile = async (fileBuffer, fileName, folder = 'memora', fileType = 'image') => {
  const ik = getIK();
  const response = await ik.files.upload({
    file: fileBuffer.toString('base64'),
    fileName,
    folder,
    useUniqueFileName: true,
    tags: ['memora-upload'],
  });

  // For PDFs: use ImageKit's page transformation to get first page as image
  // For images: standard resize
  const thumbnail = fileType === 'pdf'
    ? `${response.url}?tr=f-jpg,pg-1,w-400,h-300`
    : `${response.url}?tr=w-400,h-300,fo-auto`;

  return {
    url: response.url,
    fileId: response.fileId,
    thumbnail,
  };
};

/**
 * Delete a file from ImageKit by fileId
 */
const deleteFile = async (fileId) => {
  if (!fileId) return;
  const ik = getIK();
  await ik.files.delete(fileId);
};

module.exports = { uploadFile, deleteFile };
