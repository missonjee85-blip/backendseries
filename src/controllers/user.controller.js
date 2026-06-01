import mongoose, { version } from "mongoose";
import { ApiError } from "../utils/ApiError";
import { asynchandler } from "../utils/asyncHandler";
import { User } from "../models/user";
import { ApiResponse } from "../utils/Apiresponse";
import { subscription } from "../models/subscription.model";







const generateAccessAndRefreshTokens =async(userId) =>{
    try{
        const user =await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken =user.generateRefreshToken()

        user.refreshToken =refreshToken
        //You are saving the refresh token inside the user document.
        await user.save({validateBeforeSave :false})

        //validationBeforeSave :false so that it can skip schema validation rules while saving if we set true then it will check all the schema . we are updating only one field here .

       return {accessToken,refreshToken}

//        return = "send result outside the function" so that anyone who is outside can use this 

//        Real life analogy
// Kitchen (function) → prepares food
// return → waiter carries food to customer

// Without return → customer gets nothing

    }
    catch(error){
        throw new ApiError(500, "something went wrong while generating access and refresh token ")
    }
}  

//  I am creating a user registration function and wrapping it with automatic error handling. without asynchandler we  have to write try catch for prevent from catch 
const registerUser = asynchandler ( async(req , res) =>{

    const{fullName, email , password, username} =req.body 

    // object destructuring :It is a shortcut to extract values from an object.
    // Without destructuring

    // You would write:

    // const fullName = req.body.fullName
    // const email = req.body.email
    // const username = req.body.username
    // const password = req.body.password

    if (
    [ fullName,password,email,username].some((field) => field?.trim()=== ""))
    {
        throw new ApiError(400  , "all fields are required ")
    }


    // without array if (!fullName || !email || !username || !password)
    // .some() checks each item

    // field?.trim() === ""
    // Means:
    // Is value empty after removing spaces?

    // If ANY field is empty → true
    // So:
    // ERROR → All fields are required

    // Take array → loop one by one → pass each value into callback

    // internally how field works here field is callback parameter created by .some()
    // field = fullName   → first loop
    // field = email      → second loop
    // field = username   → third loop
    // field = password   → fourth loop


    const existedUser = await user.findone({
        $or :[{username} ,{email}] //Match ANY ONE condition
    })

    if (existedUser) {
        throw new ApiError(409 ,"user with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    const coverImageLocalPath =req.files?.coverImage[0]?.path;

    let coverImageLocalPath; //let here because if we write const then we need to write immediately like above but in let we check the condition before 
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath =req.files.coverImage[0].path
    }

    if (!avatarLocalPath){
        throw new ApiError(400 ,"Avatar file is required")
    }

    const avatar = await uploadonCloudinary(avatarLocalPath)
    const coverImage =await uploadonCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400 ,"Avatar file is required") //Did Cloudinary actually upload image?
    }
 ///create user object create entry in db
    const user = await User.create({
        fullName,
        avatar :avatar.url,
        coverImage :coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError (500 ,"something when wrong while registring the user")
    }

    return res.status(201).json(
        new ApiResponse(200 ,createdUser ,"user registered successfully")
    )



})

const loginUser =asyncHandler(async(req,res) =>{

   const{email,password,username} =req.body 

   if (!username && !email){
    throw new ApiError(400,"username or email is required")
   }

   const user =await User.findone({
    $or: [{username},{email}]
   })

   if(!user){
    throw new ApiError(404 ,"User does not exist")
   }

   const passwordChecker = await user.isPasswordCorrect(pasword)

   if(!passwordChecker){
    throw new ApiError(401,"invalid user credentials")
   }
   
   const{accessToken,refreshToken}= await generateAccessAndRefreshTokens(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   const option ={
    httpOnly :true,
    secure :true
   }
   return res 
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(
        200,
        {
            user :loggedInUser,accessToken,refreshToken
        },
        "user logged in successfully"
    )
   )

})

//here we are given accesstoken and refresh token to browser by cookie so that if anychange happened then backend directly verify from cookie no need of frontend database to verify .
//cookie is secure because in frontend json data hacker can hack access token and refreshtoken and change important details from that app.
//in cookieStore(name,token ,options)
const loggedoutUser = asynchandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset :{
                refreshToken:1
            } ///MongoDB operator to REMOVE a field .


        },
        {
            new:true
        } // updated document like userid and username after removing refreshtoken
    )

    const options ={
        httpOnly:true,
        secure :true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options) //remove access token from browser
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200 ,{},"User logged Out"))
})

const refreshAccessToken =asynchandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

///jwt.verify(token ,secret) do two things verify signature and decode payload means provide store data inside payload like email username
// decodedToken = {
//    _id: "u123",
//    email: "harsh@gmail.com"
// }

    try{
        const decodedToken =jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(400 , "invalid refresh token ")
        }

        if(incomingRefreshToken !== user?.Token){
            throw new ApiError(404,"refresh token is expired or already used")
        } // incomerefreshtoken is from browser and user.token is from frontend json data 

        const options ={
        httpOnly:true,
        secure :true
        }

        const{accessToken, refreshToken :newRefreshToken} =await generateAccessAndRefreshTokens(user._id)

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken ,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken :newRefreshToken},
                "Access token refreshed"
            )
        )



    }
    catch(error){
        throw new ApiError(401,error?.message || "invalid refresh token")
    }
})

const changeCurrentpassword =asynchandler(async(req,res) => {
    const {oldPassword, newPassword} =req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect =await user.isPasswordCorrect(oldPassword)

        if(!isPasswordCorrect){
            throw new ApiError(400 ,"Invalid old password")
        }

        user.password=newPassword
        await user.save({validateBeforeSave :false})

        return res
        .status(200)
        .json(new ApiResponse(200,{} ,"password changed successfully"))
    
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

// Frontend receives:
// {
//    statusCode: 200,
//    data: {
//       _id: "u123",
//       username: "harsh",
//       email: "harsh@gmail.com"
//    },
//    message: "User fetched successfully"
// }
// frontend can:

// show profile info
// know who is logged in
// keep user session after refresh

const updateAccountDetails =asynchandler(async(req,res) =>{
    const{fullName,email} =req.body

    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set :{
                fullName,
                email:email
            }
        },
        {new :true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200 ,user ,"Account details updated successfully"))

})

const updateUserAvatar =asynchandler(async(req,res) =>{
    const avatarLocalPath =req.file?.path

    if (!avatarLocalPath){
        throw new ApiError(400 ,"Avatar file is missing")

    }

    const avatar = await uploadonCloudinary(avatarLocalPath)

    if(!avatar){
        throw new ApiError(400 , "error while uploading on avatar")

    }
    const user = await User.findByIdAndUpdate(
        req.user_id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new :true}
    ).select("-password")


return res
.status(200)
.json(
    new ApiResponse(200 ,user,"Avatar image updated successfully")
)
})

const updateUserCoverImage = asynchandler(async(req,res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400 ,"cover image is missing")
    }
    const coverImage = await uploadonCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400 ,"Error while uploading on avatar")

    }

    const user = await User.findByIdAndUpdate(
        req.user_id,
        {
            $set :{
                coverImage:coverImage.url
            }
        },
        {new :true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse (200 , user ,"cover image added successfully")
    )
})


const getUserChannelProfile = asynchandler(async(req,res) =>{
    const {username}= req.params

    if (!username){
        throw new ApiError(400 ,"username is missing")
    }
    const channel = await User.aggregate([
        {
            $match :{
                username :username?.toLowerCase()
            }
        },
        {

            // Go to another collection
            // and bring matching data

            $lookup :{
                from :"subscrptions",
                 /// in models we have Subscription and in mongodb it convert to subscriptions here subscriber and channel user id is saved .Go to subscriptions collection in MongoDB
                localField:"_id",  //current user document from usercollection and take his id 
                foreignField:"channel",  // inside subscriptions collection, which field should Mongodb compare ? so mongodb will compare channel field and check that 
                // subscription.channel === user_id
                as:"subscribers" // attach matching documents 
                // Store lookup result inside subscribers field
                }
        },
        {
            $lookup :{
                from:"subscriptions",
                localField :"_id",
                foreignField:"subscriber",  // subscriptions.subscriber === user_id
                as:"subscribeTo"
            }

        },
        {
            $addFields :{
                subscribersCount :{
                    $size:"$subscribers" ///count the subscirber  [
                                                                    // { subscriber: 1, channel: 2 },
                                                                    // { subscriber: 5, channel: 2 }
                                                                    // ] subscribersCount =2
                },
                channelsSubscribedCount :{
                    $size :"$subscribedTo"
                },

                isSubscribed :{
                    $cond: {
                        if :{$in :[req.user?._id,"$subscribers.subscriber"]},
                        then :true, 
                        else :false                                                   // supposed loggedin user req.user._id = 1    subscribe array  subscribers = [
//                                                                                                             { subscriber: 1, channel: 2 },
//                                                                                                             { subscriber: 5, channel: 2 } "$subscribers.subscriber"

                                                                                            // extracts only subscriber IDs.

                                                                                            // So it becomes:

                                                                                            // [1, 5]

                                                                                            // $in: [req.user._id, [1,5]]

                                                                                            // becomes:

                                                                                            // $in: [1, [1,5]]

                                                                                            // Is 1 present inside [1,5] ?

                                                                                            // YES.

                                                                                            // So condition becomes TRUE.
                                                                                            
                                                                                            // java script version :
                                                                                            // if(isStudent){
                                                                                            // result = "yes"
                                                                                            // }else{
                                                                                            // result = "no"
                                                                                            // }
                                                                                            // mongodb Aggregation version
                                                                                            // {
                                                                                            // $cond: {
                                                                                            //     if: <condition>,
                                                                                            //     then: <value if true>,
                                                                                            //     else: <value if false>
                                                                                            // }
                                                                                            // }


                                                   
        
                    }

                }



            }
        },
        {
            $projects :{
                fullName :1,
                username :1,
                subscribersCount :1,
                channelsSubscribedCount :1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
 
    ]) 
     ///in aggregation pipelines we use pipeline stage is $match ,$lookup,$addFields ,$project  and 1 means true and 0 means false means hide that . 
    /// in aggregation we cant use .select because .select belongs to normal mongoose query like find(),findOne(), findById()

    if(!channel?.length){
        throw new ApiError(404 ,"channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200 ,channel[0],"user channel fetched successfully")  // channel[0] because channel is aggreagation so it return an array but frontend wants object so we extract first object from array  
    )
})


const getWatchHistory =asynchandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match :{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from :"videos",
                localField:"watchHistory",
                foreignField:"_id",  //videos._id==watchHistory
                as :"watchHistory",
                pipeline: [{
                    $lookup :{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id", // users._id == owner
                        as :"owner",
                        pipeline :[
                            {
                                $projects :{
                                    fullName :1,
                                    username :1,
                                    avatar :1
                                
                                }
                            }
                            ]
                        } 
                    
            
                },
            {$addFields :{
                owner :{
                    $first :"$owner"
                }
            }}]
            }
           
            
        }
    ])


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watch history fetched successfully"

        )
    )
})

//  from first lookup from mongoodb
// [
//    {
//       _id: 101,
//       title: "NodeJS",
//       owner: 11
//    },

//    {
//       _id: 102,
//       title: "MongoDB",
//       owner: 12
//    }
// ]
 
// from owner pipeline 1

// {
//    _id: 101,
//    title: "NodeJS",

//    owner: [
//       {
//          fullName: "Rohit",
//          username: "rohit",
//          avatar: "img1"
//       }
//    ]
// }

















export{
    registerUser,
    loginUser,
    loggedoutUser,
    refreshAccessToken,
    changeCurrentpassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
    
}











// With { new: true }

// returns UPDATED document:

// {
//    _id: "u123",
//    username: "harsh"
// }
// Important

// In your code, you are not storing returned document:

// await User.findByIdAndUpdate(...)

// So technically:

// new: true is not even needed here

// because result is ignored.

// Usually used like this
// const updatedUser = await User.findByIdAndUpdate(
//    id,
//    update,
//    { new: true }
// )

// Now:

// updatedUser

// contains latest document.





// When you write:

// User.findById(userId)

// Mongoose automatically converts it into a MongoDB query like:

// User.findOne({ _id: userId })