import mongoose,{Schema} from "mongoose"



const userSchema =new Schema({
    username :{
        type:String,
        required:true,
        unique :true ,
        lowercase:true,
        trim:true,
        index:true
    },
    email :{
        type:String,
        required:true,
        unique:true,
        trim:true  

    },
    fullname :{
        type:String,
        required:true,
        trim:true, // remove extra spaces
        index:true
    },
    avatar :{
        type:String,
        required:true

    },
    coverimage :{
        type :String,
    },
    watchhistory :[
        {
            type:Schema.Types.ObjectId,
            ref:"video"

        }
    ],
    password:{
        type:String,
        required:[true ,'password is required']
    },
    refreshtoken:{
        type:String
    }
},
{
    timestamps:true    //createdAt
                       //updatedAt
}

)


// await only works inside an async function.
userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next(); 

    // If password is not changed:

    // return next();

    // This skips hashing again.

    this.password=await bcrypt.hash(this.password,10)
    next()

//     Why use normal function instead of arrow function?

// Correct:

// function (next) {}

// Wrong:

// (next) => {}

// Because Mongoose gives document data through this.

// Inside normal function:

// this.password

// works.

// Inside arrow function, this does not point to the document.
 })


//  next() tells Mongoose:

// “This middleware is finished, continue the save operation.”

// Your middleware is part of a chain.

// Simple Flow
// user.save()
//     ↓
// pre("save") middleware runs
//     ↓
// next()
//     ↓
// MongoDB save happens

// If you do NOT call next(), Mongoose waits forever because it thinks middleware is still running.


userSchema.methods.isPasswordCorrect =async function(password){
    return await bcrypt.compare(password,this.password)
}

// Create a function called isPasswordCorrect for all users

userSchema.methods.generateAccessToken =function(){
    return jwt.sign(
        {
          _id: this._id,
          email:this.email,
          username:this.username,
          fullname:this.fullname 
          //PAYLOAD

        },
        process.env.ACCESS_TOKEN_SECRET, //secret  Security and verification
        {expiresIn :process.env.ACCESS_TOKEN_EXPIRY} // options means extra setting like expiry 
        
    )
}

// jwt.sign(payload, secret, options) token creation jwt.verify(token,secret ) verify that secret key from signature and secret from.env is same or not . signature is combination of header ,payload and secret key so hacker can not decode it .
// payload is decided by user like 
// xxxxx.yyyyy.zzzzz
// HEADER.PAYLOAD.SIGNATURE
// here payload is clearly visible so we should never choose sensible data like password ,bank details because any one can decode it easily .
// we need to pass id or user details because if frontend send access token then how bckend understand which user is given this token . so jwt needs id so that it can see from database that which user is giving that token so that he verify that user is correct and he can give access .
// HEADER + PAYLOAD + SECRET
//         ↓
//      hashing
//         ↓
//     SIGNATURE

//     signature is decide by secret key also and secret is decide by backend develpoer . 

//     When backend receives token, it verifies:

// ```txt id="jlwmag"
// "Was this token created using MY secret key?"
// ```

// using:

// ```js id="jlwmc7"
// jwt.verify(token, secret)
// ```

// ---

// # Step-by-step

// Suppose token:

// ```txt id="jlwm5o"
// HEADER.PAYLOAD.SIGNATURE
// ```

// Example:

// ```txt id="zjlwm3"
// aaa.bbb.ccc
// ```

// Backend already knows secret:

// ```txt id="9jlwmq"
// mysecret123
// ```

// stored in `.env`.

// ---

// # Verification Process

// ## Step 1 — Split token

// JWT library separates:

// ```txt id="7jlwmd"
// HEADER
// PAYLOAD
// SIGNATURE
// ```

// ---

// ## Step 2 — Recreate signature

// Library again calculates:

// ```txt id="jlwmh8"
// hash(HEADER + PAYLOAD + SECRET)
// ```

// using backend secret.

// This creates:

// ```txt id="jlwm3c"
// NEW_SIGNATURE
// ```

// ---

// ## Step 3 — Compare

// JWT checks:

// ```txt id="jlwmd8"
// NEW_SIGNATURE === TOKEN_SIGNATURE ?
// ```

// If YES ✅

// ```txt id="6jlwmf"
// token is valid
// ```

// If NO ❌

// ```txt id="5jlwmx"
// token is fake or modified
// ```

// ---

// # Visual Example

// Suppose original token was created using:

// ```txt id="c7h6x5"
// secret = mysecret123
// ```

// Signature becomes:

// ```txt id="jlwmk2"
// ABC999
// ```

// Token:

// ```txt id="jlwmr7"
// HEADER.PAYLOAD.ABC999
// ```

// ---

// # Later verification

// Backend again uses:

// ```txt id="jlwm4t"
// HEADER + PAYLOAD + mysecret123
// ```

// creates:

// ```txt id="jlwm6x"
// ABC999
// ```

// Matches token signature:

// ```txt id="jlwm9x"
// ABC999 === ABC999
// ```

// Valid token ✅

// ---

// # If attacker changes payload

// Payload changed:

// ```txt id="jlwmv8"
// _id:101 → _id:999
// ```

// Now backend calculates new signature:

// ```txt id="j0r7x9"
// XYZ111
// ```

// But token still has old signature:

// ```txt id="jlwmc2"
// ABC999
// ```

// Comparison:

// ```txt id="jlwmw3"
// XYZ111 !== ABC999
// ```

// Verification fails ❌

// ---

// # If attacker knows token but not secret

// They can SEE:

// ```txt id="3jlwmk"
// header
// payload
// signature
// ```

// But cannot generate correct signature because:

// ```txt id="jlwmd0"
// secret key is unknown
// ```

// ---

// # Main Idea

// Verification means:

// ```txt id="3jlwmv"
// "Can I recreate the same signature using my secret?"
// ```


userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id=this._id

        },
        process.env.ACCESS_REFRESH_TOKEN_SECRET,
        {expiresIn : process.env.REFRESH_TOKEN_EXPIRY}
    )
}

export const User = mongoose.model("User",userschema)