import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        // console.log("localfilepath : ",localFilePath);;
        if(!localFilePath) return null;
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type : "auto"
        })
        // file has been uploaded successfully
        // console.log("File has been uploaded, url : ", response.url)

        // remove the locally saved file as the upload operation is successfull.
        fs.unlinkSync(localFilePath);
        return response;
    }catch(err){
        fs.unlinkSync(localFilePath) // remove the locally saved file as the upload operation got failed.
        return null;
    }
}

export {uploadOnCloudinary};
