import express from "express";
import {createServer} from "node:http";
import mongoose from "mongoose";
import dotenv from 'dotenv';
import connectToSocket from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
dotenv.config();
const app=express();
const server=createServer(app);
const io=connectToSocket(server);
app.set("port",(process.env.PORT||8000));
app.use(cors());
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb",extended:true}));
app.use("/api/v1/users",userRoutes);
const start=async()=>{
    const connectionDb=await mongoose.connect(process.env.MONGO_URL);
    console.log(`Mongo connected db host: ${connectionDb.connection.host}`);
    server.listen(app.get("port"),()=>{
        console.log("Listening")
    });
}
start();