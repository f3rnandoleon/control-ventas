
import {NextResponse} from 'next/server'
import User from'@/models/user'
import bcrypt from 'bcryptjs'
import {connectDB} from '@/libs/mongodb'

export function GET(){
    return NextResponse.json({message: "sign up"});
}
export async function POST(request:Request){
    const {email,password,fullname}= await request.json()
    if(!password || password.length<6) 
        return NextResponse.json({
        message: "Contrasena debe ser al menos de 6 caracteres"
        },{
            status:400 
        });
    try{
        await connectDB();
        const userFound= await User.findOne({email});
        if(userFound) 
            return NextResponse.json({
                message: "Email ya existe",
            },{
                status:409,
            });

        const hashPassword =await bcrypt.hash(password,12)
        const user=new User({
            email,
            fullname,
            password:hashPassword
        });
        const savedUser= await user.save();
        console.log(savedUser);
        return NextResponse.json(savedUser);
    }catch(error){
        console.log(error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}