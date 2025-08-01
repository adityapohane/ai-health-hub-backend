require("dotenv").config();
const swaggerJSDoc = require("swagger-jsdoc");

const BASE_URL = process.env.BASE_URL || "http://localhost:8000";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My API Documentation",
      version: "1.0.0",
      description: "API documentation for my Node.js backend",
    },
    servers: [
      {
        url: `${BASE_URL}/api/v1`,
        description: "Environment-specific base URL",
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
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./services/**/*.js"], // Path to your route files with Swagger JSDoc comments
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
