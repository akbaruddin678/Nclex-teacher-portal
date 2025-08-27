// controllers/notificationController.js
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/apiResponse");
const Notification = require("../models/Notification");

// optional aliases to tolerate common typo
const TYPE_ALIASES = {
  principle: "principals",
  principal: "principals",
};

const CREATABLE_BY_ROLE = {
  admin: ["admin", "principals", "teachers", "both", "all"],
  coordinator: ["principals", "teachers", "both", "all"],
  principal: ["principals", "teachers", "both", "all"],
  // ⬇️ change for teacher: can send only to admin/principals/both
  teacher: ["principals", "admin", "both"],
};

exports.createNotification = asyncHandler(async (req, res, next) => {
  let { recipientType, subject, message, schedule } = req.body;

  if (!recipientType || !subject || !message) {
    return next(new ErrorResponse("All required fields must be provided", 400));
  }

  // normalize role + recipientType
  const role = String(req.user?.role || "").toLowerCase();
  recipientType = String(recipientType || "").toLowerCase();
  recipientType = TYPE_ALIASES[recipientType] || recipientType;

  const allowed = CREATABLE_BY_ROLE[role] || [];
  if (!allowed.includes(recipientType)) {
    return next(
      new ErrorResponse("Not allowed to create this type of notification", 403)
    );
  }

  const notification = await Notification.create({
    recipientType,
    subject,
    message,
    schedule,
    createdBy: req.user.id,
  });

  res.status(201).json({ success: true, data: notification });
});

/* -------------------------- LIST -------------------------- */
/* -------------------------- LIST -------------------------- */
exports.getNotifications = asyncHandler(async (req, res) => {
  const role = String(req.user?.role || "").toLowerCase();

  // Teachers: only receive from Admin/Principal (to teachers/both/all) + their own sent
  if (role === "teacher") {
    const myId = String(req.user.id);

    // Pull a minimal superset, then filter server-side after populate
    const superset = await Notification.find({
      $or: [
        { createdBy: myId }, // my sent
        { recipientType: { $in: ["teachers", "both", "all"] } }, // potential received
      ],
    })
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    const filtered = superset.filter((n) => {
      const creatorId = String(n?.createdBy?._id || n?.createdBy || "");
      const creatorRole = String(n?.createdBy?.role || "").toLowerCase();
      const isMine = creatorId === myId;
      const fromAdminOrPrincipal =
        creatorRole === "admin" || creatorRole === "principal";
      return isMine || fromAdminOrPrincipal; // only my sent or admin/principal received
    });

    return res
      .status(200)
      .json({ success: true, count: filtered.length, data: filtered });
  }

  // Other roles: keep your original role-based recipient visibility
  const VIEW_MATRIX = {
    admin: ["admin", "principals", "teachers", "both", "all"],
    coordinator: ["principals", "teachers", "both", "all"],
    principal: ["principals", "both", "all"],
    teacher: ["teachers", "both", "all"], // not used here anymore
    student: ["all"],
  };
  const allowed = VIEW_MATRIX[role] || ["all"];

  const { recipientType } = req.query;
  const filter = {};
  if (recipientType) {
    if (allowed.includes(recipientType)) {
      filter.recipientType = recipientType;
    } else {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
  } else {
    filter.recipientType = { $in: allowed };
  }

  const notifications = await Notification.find(filter)
    .populate("createdBy", "name email role")
    .sort({ createdAt: -1 });

  res
    .status(200)
    .json({ success: true, count: notifications.length, data: notifications });
});

/* -------------------------- GET ONE ----------------------- */
exports.getNotificationById = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id).populate(
    "createdBy",
    "name email role"
  );

  if (!notification) {
    return next(new ErrorResponse("Notification not found", 404));
  }

  const role = String(req.user?.role || "").toLowerCase();

  if (role === "teacher") {
    const myId = String(req.user.id);
    const creatorId = String(
      notification?.createdBy?._id || notification?.createdBy || ""
    );
    const creatorRole = String(
      notification?.createdBy?.role || ""
    ).toLowerCase();
    const toTeachersGroup = ["teachers", "both", "all"].includes(
      String(notification.recipientType).toLowerCase()
    );
    const fromAdminOrPrincipal =
      creatorRole === "admin" || creatorRole === "principal";
    const isMine = creatorId === myId;

    if (!(isMine || (toTeachersGroup && fromAdminOrPrincipal))) {
      return next(
        new ErrorResponse("Not authorized to view this notification", 403)
      );
    }
    return res.status(200).json({ success: true, data: notification });
  }

  // other roles: your original recipient check
  const VIEW_MATRIX = {
    admin: ["admin", "principals", "teachers", "both", "all"],
    coordinator: ["principals", "teachers", "both", "all"],
    principal: ["principals", "both", "all"],
    student: ["all"],
  };
  const allowed = VIEW_MATRIX[role] || ["all"];

  if (!allowed.includes(notification.recipientType)) {
    return next(
      new ErrorResponse("Not authorized to view this notification", 403)
    );
  }

  res.status(200).json({ success: true, data: notification });
});
