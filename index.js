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
const socketIO = require("socket.io")
const { setIO } = require("./socketIO/socket")
const http = require("http")
const mysql = require("mysql2/promise")

dotenv.config()

const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(morgan("dev"))
app.use(express.json())
app.use(cookieParser())
app.use(bodyParser.json())

const server = http.createServer(app)

const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:8080"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

setIO(io)

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
)

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
// Database connection
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "healthhub",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})
// Test database connection
pool
  .getConnection()
  .then((connection) => {
    console.log("✅ Database connected successfully")
    connection.release()
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err)
  })

// Helper function to find or create conversation
async function findOrCreateConversation(user1Id, user2Id) {
  let connection
  try {
    connection = await pool.getConnection()

    // Check if conversation exists (order-agnostic)
    const [rows] = await connection.query(
      `SELECT id FROM team_conversations 
       WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
      [user1Id, user2Id, user2Id, user1Id],
    )

    if (rows.length > 0) {
      console.log(`📋 Found existing conversation: ${rows[0].id} between ${user1Id} and ${user2Id}`)
      return rows[0].id
    } else {
      // Create new conversation
      const [result] = await connection.query(
        `INSERT INTO team_conversations (user1_id, user2_id, created_at) VALUES (?, ?, NOW())`,
        [user1Id, user2Id],
      )
      console.log(`✨ Created new conversation: ${result.insertId} between ${user1Id} and ${user2Id}`)
      return result.insertId
    }
  } catch (error) {
    console.error("❌ Error with conversation:", error)
    throw error
  } finally {
    if (connection) connection.release()
  }
}

// Socket connection handling
io.on("connection", (socket) => {
  console.log("🟢 New connection:", socket.id)

  // User registration
  socket.on("registerUser", (userId) => {
    socket.userId = userId
    socket.join(`user_${userId}`)
    console.log(`👤 User registered: ${userId} in room user_${userId}`)
  })

  // Join conversation
  socket.on("joinConversation", async ({ senderId, receiverId }) => {
    try {
      console.log(`🏠 Processing joinConversation: ${senderId} <-> ${receiverId}`)

      if (!senderId || !receiverId) {
        console.error("❌ Missing senderId or receiverId")
        socket.emit("error", { message: "Missing user IDs" })
        return
      }

      // Find or create conversation
      const conversationId = await findOrCreateConversation(senderId, receiverId)

      // Join conversation room
      socket.join(`conversation_${conversationId}`)
      console.log(`🏠 User ${senderId} joined room: conversation_${conversationId}`)

      // Emit confirmation
      socket.emit("conversationJoined", {
        conversationId,
        senderId,
        receiverId,
      })

      console.log(`✅ Conversation joined successfully: ${conversationId}`)
    } catch (error) {
      console.error("❌ Error joining conversation:", error)
      socket.emit("error", { message: "Failed to join conversation" })
    }
  })

  // Get conversation history
  socket.on("getConversationHistory", async ({ conversationId, userId }) => {
    try {
      console.log(`📚 Getting history for conversation: ${conversationId}, user: ${userId}`)

      if (!conversationId || !userId) {
        console.error("❌ Missing conversationId or userId")
        socket.emit("error", { message: "Missing parameters" })
        return
      }

      const connection = await pool.getConnection()

      const [messages] = await connection.query(
        `SELECT 
          id, conversation_id, sender_id, receiver_id, message, created_at
         FROM team_messages 
         WHERE conversation_id = ? 
         ORDER BY created_at ASC`,
        [conversationId],
      )

      connection.release()

      console.log(`📚 Found ${messages.length} messages for conversation ${conversationId}`)
      console.log(messages)
      // Send history back to the requesting client
      socket.emit("conversationHistory", {
        conversationId,
        messages: messages || [],
      })
    } catch (error) {
      console.error("❌ Error getting conversation history:", error)
      socket.emit("error", { message: "Failed to get conversation history" })
    }
  })

  // Send message
  socket.on("sendMessage", async ({ sender_id, receiver_id, message, tempId }) => {
    try {
      console.log(`📤 Processing sendMessage: ${sender_id} -> ${receiver_id}: "${message}"`)

      if (!sender_id || !receiver_id || !message?.trim()) {
        console.error("❌ Invalid message data")
        socket.emit("error", { message: "Invalid message data" })
        return
      }

      // Find conversation
      const conversationId = await findOrCreateConversation(sender_id, receiver_id)

      // Save to database
      const connection = await pool.getConnection()

      const [result] = await connection.query(
        `INSERT INTO team_messages (conversation_id, sender_id, receiver_id, message, created_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [conversationId, sender_id, receiver_id, message.trim()],
      )

      // Get the saved message with timestamp
      const [savedMessage] = await connection.query(`SELECT * FROM team_messages WHERE id = ?`, [result.insertId])

      connection.release()

      const messageData = {
        ...savedMessage[0],
        tempId, // Include tempId for client-side matching
      }

      console.log(`✅ Message saved with ID: ${result.insertId}`)

      // Send to receiver's personal room
      io.to(`user_${receiver_id}`).emit("receiveMessage", messageData)
      console.log(`📨 Message sent to user_${receiver_id}`)

      // Confirm to sender
      socket.emit("messageSentConfirmation", messageData)
      console.log(`✅ Confirmation sent to sender`)
    } catch (error) {
      console.error("❌ Error sending message:", error)
      socket.emit("error", { message: "Failed to send message" })
    }
  })

  // Typing events
  socket.on("typing", ({ conversationId, userId }) => {
    if (!conversationId || !userId) {
      console.warn("❌ Invalid typing data")
      return
    }

    console.log(`⌨️ User ${userId} typing in conversation ${conversationId}`)

    // Broadcast to all users in the conversation room except sender
    socket.to(`conversation_${conversationId}`).emit("displayTyping", {
      userId,
      conversationId,
    })
  })

  socket.on("stopTyping", ({ conversationId, userId }) => {
    if (!conversationId || !userId) {
      console.warn("❌ Invalid stopTyping data")
      return
    }

    console.log(`⌨️ User ${userId} stopped typing in conversation ${conversationId}`)

    // Broadcast to all users in the conversation room except sender
    socket.to(`conversation_${conversationId}`).emit("removeTyping", {
      userId,
      conversationId,
    })
  })

  // Disconnect
  socket.on("disconnect", (reason) => {
    console.log(`🔴 User disconnected: ${socket.id}, reason: ${reason}`)
    if (socket.userId) {
      console.log(`👤 User ${socket.userId} disconnected`)
    }
  })

  // Error handling
  socket.on("error", (error) => {
    console.error("❌ Socket error:", error)
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
