import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";// iska kaam itna h ki browser se cookie send v kr pau aur access v kar pau

const app = express()
//we use app.use jb aapko middleware ya configuration setting krni h 
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials:true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

export { app }