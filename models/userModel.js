import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
const userSchema = new mongoose.Schema({

  fullname: {
    type: String,
    trim: true,
    required: true,
  },
  username: {
    type: String,
    required:true,
    trim: true,
    unique: true
  },
  email: {
  type: String,
  required:true,
  unique: true,
  match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
},
  password: {
    type: String,
    trim: true,
    required: true
  },
  phone:{
    type: String,
    trim: true,
    required:true
  },
  address: {
    type : String,
     required: true
    },
  role: {
    type: String,
    required: true,
    enum: ["admin", "manager","receptionist"],
    default: "receptionist"
  },

},
 {
  timestamps: true
}
);

userSchema.pre("save", async function (next) {
    if(this.isModified("password")){
        this.password = await bcryptjs.hash(this.password, 12);
    }
  next();
})

export default mongoose.model('user', userSchema);




