import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async function(filePath){
    try {
        if(!filePath) return null;
        // upload file
        const response = await cloudinary.uploader.upload(filePath,{resource_type:"auto"});
        console.log(`File has been successfuly uploaded ${response.url}`);
        return response;   
    } catch (error) {
        fs.unlink(filePath);
        console.log(`Cloudinary Upload Error: ${error}`);   
    }
}   

export {uploadOnCloudinary};

