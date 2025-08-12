// smart-home-automation-api/src/models/User.test.ts
import User from "./User";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;

// Mock mongoose connect/disconnect for isolated model testing
beforeAll(async () => {
  //                               // We'll add a proper test DB connection for integration tests later.
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("User Model", () => {
  // Clear the User collection before each test
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("should hash the password before saving a new user", async () => {
    const user = new User({
      username: "testuser_hash",
      email: "hash@example.com",
      password: "PlainPassword123!",
      role: "member",
    });

    await user.save();

    // Fetch the user again to ensure the password is hashed in DB
    const foundUser = await User.findById(user._id).select("+password");
    expect(foundUser).toBeDefined();
    expect(foundUser!.password).not.toEqual("PlainPassword123!"); // Should not be plain text

    const isMatch = await bcrypt.compare(
      "PlainPassword123!",
      foundUser!.password!,
    );
    expect(isMatch).toBe(true);
  });

  it("should not re-hash the password if it is not modified", async () => {
    const user = new User({
      username: "testuser_nohash",
      email: "nohash@example.com",
      password: "OriginalPassword123!",
      role: "member",
    });
    await user.save();

    const originalHash = user.password;

    // Modify a non-password field
    user.username = "newusername";
    await user.save();

    // Fetch the user again and check if password hash is still the same
    const foundUser = await User.findById(user._id).select("+password");
    expect(foundUser!.password).toEqual(originalHash);
  });

  it("should compare password correctly using comparePassword method", async () => {
    const user = new User({
      username: "testuser_compare",
      email: "compare@example.com",
      password: "PasswordToCompare123!",
      role: "member",
    });
    await user.save();

    const isMatch = await user.comparePassword("PasswordToCompare123!");
    expect(isMatch).toBe(true);

    const isNotMatch = await user.comparePassword("WrongPassword!");
    expect(isNotMatch).toBe(false);
  });
});
