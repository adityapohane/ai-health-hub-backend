const express = require("express");
const app = express();
const helmet = require("helmet"); // ✅ Helmet
const morgan = require("morgan"); // ✅ Morgan
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

dotenv.config();

const PORT = process.env.PORT || 8000;

// ✅ Use Helmet and Morgan
app.use(helmet());

app.use(morgan("dev"));

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*", // Set your specific domain in production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight response for 24 hours
}));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp",
  })
);

cloudinaryConnect();

// Routes
const apiRoutes = require("./routes/index");
app.use("/api/v1", apiRoutes);
app.use('/check',(req,res)=>{
    res.send({
        status: true,
        message: 'success'
    })
})
app.use('/api/v1/ping', (req, res) => {
  res.json({
      status: 'success',
      message: 'pong'
  });
});

// Health check route
app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your server is up and running ..."
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log("Server running...");
});
