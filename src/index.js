
// import express from "express"
// import mongoose from "mongoose"
import {app} from './app.js'

import connectDb from "./db/index.js"
import dotenv from "dotenv"
dotenv.config({
    path: './.env'
})

connectDb().
then(()=>{
app.listen(process.env.PORT || 8000 ,()=> {
    console.log(`server is running at port ${process.env.PORT}`);
})
})

.catch((error) =>{
    console.log("monogdb is not running " ,error);
})


// uses callback functions because:

// .then() needs a function
// .catch() needs a function
// app.listen() needs a function

// second option to write directly in IDBIndex.js no need to separe file and then import 


//  const app = express()

// (async () =>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error" ,(error)=>{
//             console.log("error :" ,error)
//             throw error 

//         })

//         app.listen(process.env.PORT ,() =>{
//             console.log(`server is listening on ${process.env.PORT}`)
//         })
//     }
//     catch(error){
//         console.log("error :" ,error)
//         throw error
//     }

// })();








        // Why Use throw error

        // Sometimes only printing error is not enough.

        // Example:

        // console.log(error);

        // App may continue running incorrectly.

        // Using:

        // throw error;

        // tells JavaScript:

        // 👉 “This error is serious. Stop and handle it properly.”

// this is called iife Immediately Invoked Function Expression

        // const makeTea = () => {
        // console.log("Tea Ready");
        // };

        // Tea not made yet.

        // Need:

        // makeTea();
        // But IIFE Does Both Together
        // (() => {
        // console.log("Tea Ready");
        // })();
        // function created
        // function called immediately

        // in one step.