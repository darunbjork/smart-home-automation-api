// smart-home-automation-api/src/config/swagger.ts
import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Smart Home Automation API",
      version: "1.0.0",
      description:
        "A robust and scalable backend for a smart home automation system.",
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      responses: {
        BadRequest: {
          description: "Bad Request. The request was invalid.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { error: { type: "object" } },
              },
            },
          },
        },
        Unauthorized: {
          description:
            "Unauthorized. Authentication token is missing or invalid.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { error: { type: "object" } },
              },
            },
          },
        },
        Forbidden: {
          description:
            "Forbidden. The authenticated user does not have access to this resource.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { error: { type: "object" } },
              },
            },
          },
        },
        NotFound: {
          description: "Not Found. The requested resource was not found.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { error: { type: "object" } },
              },
            },
          },
        },
        Conflict: {
          description:
            "Conflict. A resource with the same identifier already exists.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { error: { type: "object" } },
              },
            },
          },
        },
        InternalServerError: {
          description:
            "Internal Server Error. Something went wrong on the server.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { error: { type: "object" } },
              },
            },
          },
        },
      },
      schemas: {
        UserResponse: {
          type: "object",
          properties: {
            _id: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a0" },
            username: { type: "string", example: "owneruser" },
            email: { type: "string", example: "owner@example.com" },
            role: {
              type: "string",
              enum: ["owner", "member"],
              example: "owner",
            },
            households: {
              type: "array",
              items: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a1" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        DeviceResponse: {
          type: "object",
          properties: {
            _id: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a2" },
            name: { type: "string", example: "Living Room Light" },
            type: { type: "string", example: "light" },
            status: {
              type: "string",
              enum: ["online", "offline", "unknown"],
              example: "online",
            },
            household: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a1" },
            owner: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a0" },
            data: { type: "object", example: { on: true, brightness: 80 } },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        HouseholdResponse: {
          type: "object",
          properties: {
            _id: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a1" },
            name: { type: "string", example: "Doe Family Home" },
            owner: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a0" },
            members: {
              type: "array",
              items: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a0" },
            },
            devices: {
              type: "array",
              items: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a2" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Invitation: {
          type: "object",
          properties: {
            _id: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a3" },
            household: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a1" },
            inviter: { type: "string", example: "60f8b8e0c8d7c1a0c8d7c1a0" },
            inviteeEmail: { type: "string", example: "member@example.com" },
            token: {
              type: "string",
              example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
            },
            expiresAt: {
              type: "string",
              format: "date-time",
              example: "2025-07-22T10:00:00Z",
            },
          },
        },
      },
    },
  },
  apis: [
    "./src/routes/*.ts", // Path to the API routes
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
