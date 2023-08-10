import mongoose from "mongoose";

let isConnected = false; // Variable to check the connection status

export const connectToDB = async () => {
  //  prevent unknown field queries.
  mongoose.set("strictQuery", true);

  if (!process.env.MONGODB_URL) return console.log("MongoDB URL not found");

  // If the connection is already established, return without creating a new connection.
  if (isConnected) {
    console.log("MongoDB connection already established");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URL);

    isConnected = true; //  connection status equal to true
    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }
};