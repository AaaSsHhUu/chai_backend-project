// require("dotenv").config({path : "./env"}) // it is ok but for import consistency we use different approach.

import dotenv from "dotenv"
import connectDB from './db/dbconfig.js';
import app from "./app.js";
dotenv.config({path : './.env'})


connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000,() => {
        console.log("Server running on Port:",process.env.PORT);
    })
})
.catch((err)=>{
    console.log("Mongodb connection error index : ", err);
})