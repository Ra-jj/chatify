import { config } from "dotenv";
import { connectDB } from "../lib/db.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

config();

const seedUsers = [
  // Female Users
  {
    email: "emma.thompson@example.com",
    fullName: "Emma Thompson",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/1.jpg",
  },

  // Male Users
  {
    email: "james.anderson@example.com",
    fullName: "James Anderson",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/men/1.jpg",
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // 1. Delete previously seeded users to avoid duplicate email errors
    const seedEmails = seedUsers.map((user) => user.email);
    await User.deleteMany({ email: { $in: seedEmails } });

    // 2. Hash passwords for all seeded users
    const salt = await bcrypt.genSalt(10);
    const usersToInsert = await Promise.all(
      seedUsers.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, salt);
        return {
          ...user,
          password: hashedPassword,
        };
      })
    );

    // 3. Insert the users with hashed passwords
    await User.insertMany(usersToInsert);
    console.log("Database seeded successfully with hashed passwords!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

// Call the function
seedDatabase();
