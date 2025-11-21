import {Schema,model, models} from 'mongoose';


const userSchema =new Schema({
    email: {
        type: String,
        unique:true,
        required: true,
        match:[ 
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            "Email no valido"
        ],
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    fullname:{
        type: String,
        required: true,
        minLength:[3, "Fullname debe ser al menos de 3 caracteres"],
        MaxLength:[50,"Fullname debe ser como maximo de 50 caracteres"],
    },
});
const User= models.User || model('User',userSchema)
export default User;