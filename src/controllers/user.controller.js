import  asyncHandler  from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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

  const existedUser = User.findOne({
      $or: [{username} , { email }]
  })
   console.log(existedUser);


  if(existedUser){
    throw new ApiError(409,"User with email or username already exist")
  }
   
  //multer gives access to req.files just req.body is given by express by default
 
  //first property k andr ek object milta h jisko agr optionally lenge to
  //  usse uka poora path mil skta h cuz of multer
  const avatarLocalPath = req.files?.avatar[0]?.path ;
   console.log(avatarLocalPath);
  const coverImageLocalPath =  req.files?.coverImage[0].path;
   console.log(coverImageLocalPath);
  
  
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

export {registerUser}