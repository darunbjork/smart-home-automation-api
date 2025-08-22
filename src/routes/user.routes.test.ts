import request from "supertest";
import app from "../app";
import { connect, disconnect } from 'mongoose'; // Added import
import { MongoMemoryReplSet } from 'mongodb-memory-server'; // Added import
import User from "../models/User";
import Household from "../models/Household";

declare global {
  var __MONGOD__: MongoMemoryReplSet;
}

jest.setTimeout(30000); // Increase timeout for this test suite

describe("User Authentication and Household Management", () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI!;
    await connect(mongoUri);
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Household.deleteMany({});
  });

  afterAll(async () => {
    await disconnect();
    const replSet = global.__MONGOD__;
    if (replSet) {
      await replSet.stop();
    }
  });

  // afterAll(async () => { // This block is removed
  //   await mongoose.disconnect();
  //   await mongoServer.stop();
  // });

  it("should register a new user and create a household successfully", async () => {
    const res = await request(app).post("/users/register").send({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      householdName: "Test Household",
    });

    expect(res.statusCode).toEqual(201);
    expect(res.body.message).toEqual(
      "User registered successfully and household created.",
    );
    expect(res.body.user).toHaveProperty("_id");
    expect(res.body.user.username).toEqual("testuser");
    expect(res.body.user.email).toEqual("test@example.com");
    expect(res.body.user.households).toHaveLength(1);
    expect(res.body.user.role).toEqual("owner");

    const userInDb = await User.findById(res.body.user._id);
    expect(userInDb).not.toBeNull();
    expect(userInDb?.username).toEqual("testuser");
    expect(userInDb?.email).toEqual("test@example.com");
    expect(userInDb?.password).not.toEqual("password123"); // Password should be hashed

    const householdInDb = await Household.findById(res.body.user.households[0]);
    expect(householdInDb).not.toBeNull();
    expect(householdInDb?.name).toEqual("Test Household");
    expect(householdInDb?.owner.toString()).toEqual(userInDb?._id.toString());
    expect(householdInDb?.members).toContainEqual(userInDb?._id);
  });

  it("should not register a user with duplicate username or email", async () => {
    await request(app).post("/users/register").send({
      username: "duplicateuser",
      email: "duplicate@example.com",
      password: "password123",
      householdName: "Duplicate Household",
    });

    const res1 = await request(app).post("/users/register").send({
      username: "duplicateuser",
      email: "another@example.com",
      password: "password123",
      householdName: "Another Household",
    });
    expect(res1.statusCode).toEqual(409);
    expect(res1.body.error.message).toEqual(
      "Username or email already exists.",
    );

    const res2 = await request(app).post("/users/register").send({
      username: "uniqueuser",
      email: "duplicate@example.com",
      password: "password123",
      householdName: "Unique Household",
    });
    expect(res2.statusCode).toEqual(409);
    expect(res2.body.error.message).toEqual(
      "A user with this email already exists.",
    );
  });

  it("should log in an existing user successfully", async () => {
    await request(app).post("/users/register").send({
      username: "loginuser",
      email: "login@example.com",
      password: "loginpassword",
      householdName: "Login Household",
    });

    const res = await request(app).post("/users/login").send({
      email: "login@example.com",
      password: "loginpassword",
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual("Login successful.");
    expect(res.body.user).toHaveProperty("_id");
    expect(res.body.user.email).toEqual("login@example.com");
    expect(res.body.user.households).toHaveLength(1);
  });

  it("should not log in with invalid credentials", async () => {
    // Try to login without registering first
    const res1 = await request(app).post("/users/login").send({
      email: "nonexistent@example.com",
      password: "wrongpassword",
    });
    expect(res1.statusCode).toEqual(401);
    console.log(res1.body);
    expect(res1.body.error.message).toEqual(
      "Invalid credentials.",
    );

    // Register a user
    await request(app).post("/users/register").send({
      username: "anotheruser",
      email: "another@example.com",
      password: "correctpassword",
      householdName: "Another Household",
    });

    // Try to login with wrong password
    const res2 = await request(app).post("/users/login").send({
      email: "another@example.com",
      password: "wrongpassword",
    });
    expect(res2.statusCode).toEqual(401);
    expect(res2.body.error.message).toEqual("Invalid credentials.");
  });

  it("should return 400 if required fields are missing for registration", async () => {
    const res = await request(app).post("/users/register").send({
      username: "incomplete",
      email: "incomplete@example.com",
      // password and householdName are missing
    });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error.message).toContain(
      "Password must be at least 8 characters long",
    );
    expect(res.body.error.message).toContain("Household name is required");
  });

  it("should return 400 if required fields are missing for login", async () => {
    const res = await request(app).post("/users/login").send({
      email: "missing@example.com",
      // password is missing
    });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error.message).toEqual(
      "Validation failed: Password cannot be empty",
    );
  });
});
