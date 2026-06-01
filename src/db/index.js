import mongoose from "mongoose";
import { DB_NAME} from "../constants";

// Curly brackets mean:
// 👉 Import/export variables by their names.
// export { DB_NAME };

// Import:

// import { DB_NAME } from "./constants.js";

const connectDb =async() => {
    try{
    const connectionInstance =await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

//     `` is a backticks 
//     Template Literal
//    `${process.env.MONGODB_URI}/${DB_NAME}`

//     Combines dynamic values.

//     Example:

//     MONGODB_URI=mongodb://localhost:27017
//     DB_NAME = "documentchecker"

//     Final URL:

//     mongodb://localhost:27017/documentchecker
    console.log(`\n mongoose coonected !! db host : ${connectionInstance.Connection.host}` )

//     console.log(
//    "\n MongoDB connected !! DB HOST: " +
//    connectionInstance.connection.host
// );

        // connectionInstance.connection.host

        // Accesses nested object properties.

        // Example structure:

        // {
        // connection: {
        //     host: "localhost"
        // }
        // }

        // Access:

        // connectionInstance.connection.host

        // Output:

        // localhost
    }
    catch(error){
        console.log("mongodb connection failed ", error)
        process.exit(1)
    }

//      process.exit(1) = Stops Node.js application immediately.
//
 }

export default connectDb ;