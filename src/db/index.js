import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(
      `mongodb://muneeburr451:6bwT7b6AOsDKvWUY@ac-lxuv9qh-shard-00-00.kg53vwz.mongodb.net:27017,ac-lxuv9qh-shard-00-01.kg53vwz.mongodb.net:27017,ac-lxuv9qh-shard-00-02.kg53vwz.mongodb.net:27017/?ssl=true&replicaSet=atlas-2jofiy-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`
    );
    console.log(
      `\n Mongodb connection , DB HOST ${connection.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB CONNECTION ERROR", error);
    process.exit(1);
  }
};

export default connectDB;