"use server"

import { revalidatePath } from "next/cache";
import User from "../models/user.model";
import { connectToDB } from "../mongoose"
import { FilterQuery, SortOrder } from "mongoose";
import Thread from "../models/threads.models";


interface Params {
   userId: string;
   username: string;
   name: string;
   bio: string;
   image: string;
   path: string;
}

//users
export async function updateUser(
   { userId,
      bio,
      name,
      path,
      username,
      image, }: Params
): Promise<void> {
   connectToDB();

   try {
      await User.findOneAndUpdate({
         id: userId
      }, {
         username: username.toLowerCase(),
         name,
         bio,
         image,
         onboarded: true,
      },
         { upsert: true })


      if (path === "/profile/edit") {
         revalidatePath(path);
      }

   } catch (error: any) {
      throw new Error(`Failed to create/update user: ${error.message}`);
   }
}

//fetching single users
export async function fetchAUser(userId: string) {
   try {
      connectToDB();

      return await User.findOne({ id: userId })

   } catch (error: any) {
      throw new Error(
         `Failed to fetch user:${error.message}`
      )
   }
}

//fetching users posts
export async function fetchUsersPosts(userId: string) {
   try {
      connectToDB();

      const threads = await User.findOne({ id: userId })
         .populate({
            path: "threads",
            model: Thread,
            populate: [
               {
                  path: "children",
                  model: Thread,
                  populate: {
                     path: "author",
                     model: User,
                     select: "name image id", // Select the "name" and "_id" fields from the "User" model
                  },
               },
            ],
         })
      return threads;
   }
   catch (error: any) {
      throw new Error(
         `Failed to fetch user:${error.message}`
      )
   }
}

//fetching all users
export async function fetchAllUsers({
   userId,
   searchString = "",
   pageNumber = 1,
   pageSize = 20,
   sortBy = "desc",
}: {
   userId: string;
   searchString?: string;
   pageNumber?: number;
   pageSize?: number;
   sortBy?: SortOrder;
}) {
   try {
      connectToDB();
      // Calculate the number of users to skip based on the page number and page size.
      const skipAmount = (pageNumber - 1) * pageSize;

      // Create a case-insensitive regular expression for the provided search string.
      const regex = new RegExp(searchString, "i");
      // Create an initial query object to filter users.
      const query: FilterQuery<typeof User> = {
         id: { $ne: userId },
         // Exclude the current user from the results.$ne means not equals to
      };

      // If the search string is not empty, add the $or operator to match either username or name fields.
      if (searchString.trim() !== "") {

         //trim() removes leading and trailing whitespace from a string.
         query.$or = [

            //n MongoDB, the $or operator is used to perform a logical OR operation on an array of two or more query expressions

            { username: { $regex: regex } },
            { name: { $regex: regex } },
         ];
      }

      const sortOptions = { createdAt: sortBy };

      const usersQuery = User.find(query)
         .sort(sortOptions)
         .skip(skipAmount)
         .limit(pageSize);

      // Count the total number of users that match the search criteria (without pagination).
      const totalUsersCount = await User.countDocuments(query);

      const users = await usersQuery.exec();

      // Check if there are more users beyond the current page.
      const isNext = totalUsersCount > skipAmount + users.length;

      return { users, isNext };

   }
    catch (error: any) {
      throw new Error(
         `Failed to fetch user:${error.message}`
      )
   }
}

//getting users activities

export async function getActivity(userId: string) {
   try {
     connectToDB();
 
     // Find all threads created by the user
     const userThreads = await Thread.find({ author: userId });
 
     // Collect all the child thread ids (replies) from the 'children' field of each user thread
     const childThreadIds = userThreads.reduce((acc, userThread) => {
       return acc.concat(userThread.children);
     }, []);
 
     // Find and return the child threads (replies) excluding the ones created by the same user
     const replies = await Thread.find({
       _id: { $in: childThreadIds },
       author: { $ne: userId }, // Exclude threads authored by the same user.$in matches fields
     }).populate({
       path: "author",
       model: User,
       select: "name image _id",
     });
 
     return replies;
   } catch (error) {
     console.error("Error fetching replies: ", error);
     throw error;
   }
 }