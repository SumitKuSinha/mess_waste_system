const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());

const responseRoutes = require("./routes/response.routes");
app.use("/api/response", responseRoutes);

// DB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected (response-service)"))
  .catch(err => console.log(err));

// health route
app.get("/health", (req, res) => {
  res.json({ message: "Response service working" });
});

app.listen(5003, () => {
  console.log("Response Service running on port 5003");
});
