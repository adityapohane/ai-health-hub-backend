const express = require("express")
const app = express()
const helmet = require("helmet")
const morgan = require("morgan")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const { cloudinaryConnect } = require("./config/cloudinary")
const fileUpload = require("express-fileupload")
const dotenv = require("dotenv")
const bodyParser = require("body-parser")
const http = require("http")
const mysql = require("mysql2/promise")
const { setupSocketIO } = require("./config/socketio")

dotenv.config()

const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(morgan("dev"))
app.use(express.json())
app.use(cookieParser())
app.use(bodyParser.json())

const server = http.createServer(app)

const io = setupSocketIO(server)

app.use(
  cors({
    origin: "*",
   
  }),
)


//  credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     maxAge: 86400,

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp",
  }),
)

cloudinaryConnect()

// Routes
const apiRoutes = require("./routes/index")
app.use("/api/v1", apiRoutes)

app.use("/check", (req, res) => {
  res.send({
    status: true,
    message: "success",
  })
})

app.use("/api/v1/ping", (req, res) => {
  res.json({
    status: "success",
    message: "pong",
  })
})

// Health check route
app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your server is up and running ...",
  })
})

// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}...`)
  console.log(`📡 Socket.IO server ready for connections`)
})

module.exports = { app, server, io }
