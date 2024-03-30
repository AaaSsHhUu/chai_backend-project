// require("dotenv").config({path : "./env"}) // it is ok but for import consistency we use different approach.

import dotenv from "dotenv"
import connectDB from './db/dbconfig.js';


connectDB();