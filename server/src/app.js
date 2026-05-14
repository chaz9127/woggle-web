require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { handleWordLookup, handleWordSuggest } = require("./dictionary");
const {
  buildAuthRouter,
  buildSessionMiddleware,
  passport,
} = require("./auth");
const { buildGamesRouter } = require("./games");

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const suggestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const app = express();

// Behind Render's proxy — trust one hop so req.ip reflects the real client.
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(morgan("combined"));
app.use(express.json());

app.use(buildSessionMiddleware());
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", buildAuthRouter());
app.use("/api/games", buildGamesRouter());
app.get("/api/word/:word", lookupLimiter, handleWordLookup);
app.post("/api/word/:word/suggest", suggestLimiter, handleWordSuggest);

const clientDist = path.resolve(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/^\/(?!api\/).*/, (req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
