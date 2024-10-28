import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'

cloudinary.config({
    cloud_name: 'dsswwhcrk',
    api_key: '865488674549722',
    api_secret: 'nXQCZtWsW_lpEveRblvxF4ozL-Y' // Click 'View API Keys' above to copy your API secret
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            console.log('Local path not find  ')
            return null;
        }
        // upload
        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: 'auto' })
        // uploaded successfully
        console.log('File has been uploaded on cloudinary successfully:', response.url)
        // remove affter successfull response
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        // Error in uploading
        console.log('Error in uploading file on cloudinary')
        // now remove locally stored temporary as operation got failed
        fs.unlinkSync(localFilePath)
        return null;
    }
}

export { uploadOnCloudinary }