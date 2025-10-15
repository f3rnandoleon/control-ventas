import mongoose from "mongoose";

const {MONGODB_URL } =process.env;
if(!MONGODB_URL){
    throw new Error("MONGO DB debe estar definido");
}
export const connectDB= async()=>{
    try{
        const {connection}=await mongoose.connect(MONGODB_URL);
        if(connection.readyState==1){
            return Promise.resolve(true);
        }
    }catch(error){
        return Promise.resolve(false);
        
    }
    mongoose.connect('')
}