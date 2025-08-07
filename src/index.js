// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"

dotenv.config({
  path: '.env'
})


connectDB()
.then(() => {
  app.listen(process.env.PORT || 8000, () => {
    console.log(` Server is running at port : ${process.env.PORT}`);   
  })
})
.catch((error) => {
  console.log("MONGODB Connection Failed", error);
})






  


// database is jab v baat kro try catch use kro aur async await ka use kro
// semi-colon used before iffies are for cleaning purpose 

/*
import express from "express"
const app = express()

( async() => {  //iffy concept from javascript
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    app.on("ERROR", (error) => {
      console.log("Error", error);
      throw error;
    })

    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port ${process.env.PORT}`);
    })

  } catch (error) {
    console.log("ERROR", error)
  }
})
  */
