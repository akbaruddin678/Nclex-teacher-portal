const express = require("express");
const {
  createNotification,
  getNotifications,
  getNotificationById,
} = require("../controllers/notificationController");
const { protect } = require("../middleware");

const router = express.Router();

// ✅ Protected routes (only logged-in users can create notifications)
router.post("/", protect, createNotification);

// ✅ Anyone logged in can view notifications
router.get("/", protect, getNotifications);
router.get("/:id", protect, getNotificationById);

module.exports = router;
