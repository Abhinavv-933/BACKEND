import  asyncHandler  from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { response } from "express";

const generateAccessAndRefreshTokens = async(userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false })

    return {accessToken, refreshToken}

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token")
  }
}


const registerUser = asyncHandler( async (req, res) => {
   //1.get user details from frontend
  // 2. validation - not empty
  // 3. check if user already exist : username,email
  // 4. chcek for images, check for avatar
  // 5. upload them to cloudinary, avatar
  // 6. create user object -- create entry in db
  // 7. remove password and refresh token field from response
  // 8. check for user creation
  // 9. return response
  

   const {fullName, email, username, password } = req.body
   console.log("email:" ,email);

  //  if(fullName === ""){
  //      throw new ApiError(400,"fullName is required")
  //  }
  
  if (
    [fullName, email, username, password].some((field) => 
      field?.trim() === "" )
  ) {
    throw new ApiError(400, "All fields are required")
  }

  const existedUser = await User.findOne({
      $or: [{username} , { email }]
  })
   console.log(existedUser);


  if(existedUser){
    throw new ApiError(409,"User with email or username already exist")
  }
  // console.log(req.files);
   
  //multer gives access to req.files just req.body is given by express by default
 
  //first property k andr ek object milta h jisko agr optionally lenge to
  //  usse uka poora path mil skta h cuz of multer
  const avatarLocalPath = req.files?.avatar?.[0]?.path ;
   console.log(avatarLocalPath);
  // const coverImageLocalPath =  req.files?.coverImage?.[0]?.path;
  // console.log(coverImageLocalPath);
  
  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
    coverImageLocalPath = req.files.coverImage[0].path
  }
  
   if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required")
   }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath) 

 if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required")
   }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
   })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" // this is used to delete using selct
  )
  
  if(!createdUser){
    throw new ApiError(500, "something went wrong while registering the user")
  }
   
   return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered succesfully")
   )

})

const loginUser = asyncHandler(async(req,res) =>{
    //req body -> data 
    // valid email ya username-> user already exist or not if new then signup 
    // email-pass authentication (find user)
    //access and refresh token genrate krne pdenge
    // send cookies 
    // response bhej do end me 
    
    const {email, username, password} = req.body

    if (!username && !email) {
      throw new ApiError(400, "username or email is required");
    }

    const user = await User.findOne(
      {
        $or: [{username},{email}]
      }
    )

    if(!user){
      throw new ApiError(404, "User does not exist")
    }
     //for password check we use method isPasswordCorrect and bcrypt 
     //User-> mongoose ka object h to isse access nhi krna h 
    const isPasswordValid =  await user.isPasswordCorrect(password)
   if(!isPasswordValid){
      throw new ApiError(404, "Invlaid User Credentials")
    }

  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
   
  const loggedInUser = await User.findById(user._id).select("-password, -refreshToken")

  const options = {
    httpOnly: true,  //now these cookies can only by be modified by server only not from frontend
    secure: true 
  }

   return res
   .status(200)
   .cookie("accessToken",accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser,accessToken, refreshToken
      // here we dealing that case where user wants to save accessToken And RefreshToken by itself
      },
      "User Logged In Successfully"
    )
   )

})

const logoutUser = asyncHandler(async(req,res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
       //mongodb operator--> set
       $set:{
        refreshToken: undefined
       }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,  //now these cookies can only by be modified by server only not from frontend
    secure: true 
  } 

  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async(req,res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401,"unauthorized Request")
  }

try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
  
  const user = await User.findById(decodedToken?._id)
  
     if(!user){
      throw new ApiError(401,"Invalid Refresh Token")
    }
     
     if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401,"Refresh Token is expired")
     }
  
     const options = {
        httpOnly: true,
        secure: true
     }
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(200,
        {accessToken, refreshToken: newRefreshToken},
        "Access Token Refreshed"
      )
    )
} catch (error) {
   throw new ApiError(401, error?.message || "Invalid Refresh Token")
}

})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword, confPassword} = req.body

    if(newPassword !== confPassword){
      throw new ApiError(400,"new Password and confirm password are not same")
    }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

 if(!isPasswordCorrect){
     throw new ApiError(404, "Invalid old password")
 }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return response
  .status(200)
  .json(new ApiResponse(200, {}, "Password changed successfully"))  // here{} represent sending empty data
})

const getCurrenUser = asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json(200, req.user,"Current User fetched Successfully")
})

// file-update krwa rhe ho to alag controller aur endpoints rkha jata h better approach  
const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullName, email} = req.body

    if(!fullName || !email){
      throw new ApiError(400, "All Fields are required")
    }

    const user = User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
          fullName:fullName ,
          email,
         }
      },
      {new: true}

    ).select("-password")

    return res
          .status(200)
          .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
   
   const avatarLocalPath = req.file?.path

   if(!avatarLocalPath){
    new ApiError(400,"Avatar file is missing")
   }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
      throw new ApiError(400, "Error while uploading Avatar")
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set:{
          avatar:avatar.url
        }
      },
      {new: true}
    ).select("-password")

    return res
           .status(200)
           .json(
             new ApiResponse(200, user, "Avatar Updated successfully")
            )

})

const updateUserCoverImage = asyncHandler(async(req, res) => {
   
   const coverImageLocalPath = req.file?.path

   if(!coverImageLocalPath){
    new ApiError(400,"coverImage file is missing")
   }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
      throw new ApiError(400, "Error while uploading coverImage")
    }

   const user =  await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set:{
          coverImage: coverImage.url
        }
      },
      {new: true}
    ).select("-password")
   
    return res
           .status(200)
           .json(
             new ApiResponse(200, user, "cover Image Updated successfully")
            )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrenUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
}