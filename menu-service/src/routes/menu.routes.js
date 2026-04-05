const express = require("express");
const router = express.Router();
const Menu = require("../models/menu.model");
const Notification = require("../models/notification.model");
const NotificationRead = require("../models/notification-read.model");
const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/role");
const { setCache, getCache, deleteCache } = require("../config/redis");

const publishMenuNotification = async ({ type, title, message, menuDate, createdBy }) => {
  try {
    await Notification.create({
      type,
      title,
      message,
      menuDate,
      targetRole: "student",
      createdBy: createdBy || "admin"
    });
  } catch (error) {
    console.error("[WARN] Failed to publish menu notification:", error.message);
  }
};

// get latest notifications for students/admins
router.get("/notifications", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 30);
    const currentUserId = String(req.user?.id || req.user?._id || "");
    const notifications = await Notification.find({ targetRole: "student" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const notificationKeys = notifications.map((item) => `notif:${item._id}`);
    const receipts = await NotificationRead.find({
      userId: currentUserId,
      notificationKey: { $in: notificationKeys }
    }).lean();
    const receiptKeySet = new Set(receipts.map((item) => item.notificationKey));

    // Fallback: if notification records are empty, synthesize from latest menus.
    // This keeps student alerts working even if some older service instance handled updates.
    if (!notifications.length) {
      const recentMenus = await Menu.find({})
        .sort({ _id: -1 })
        .limit(limit)
        .lean();

      const fallbackKeys = recentMenus.map((menu) => `menu:${menu._id}`);
      const fallbackReceipts = await NotificationRead.find({
        userId: currentUserId,
        notificationKey: { $in: fallbackKeys }
      }).lean();
      const fallbackReceiptSet = new Set(fallbackReceipts.map((item) => item.notificationKey));

      const synthesized = recentMenus.map((menu) => {
        const createdAt = menu.updatedAt || menu.createdAt || (menu._id?.getTimestamp ? menu._id.getTimestamp() : new Date());
        const notificationKey = `menu:${menu._id}`;
        const isReadByCurrentUser = fallbackReceiptSet.has(notificationKey);
        return {
          _id: `menu-${menu._id}`,
          type: "menu-updated",
          title: "Menu Available",
          message: `Menu is available for ${menu.date}. Please check the latest meals.`,
          menuDate: menu.date,
          targetRole: "student",
          createdAt,
          isRead: isReadByCurrentUser,
          readAt: null,
          readByUserId: isReadByCurrentUser ? currentUserId : null,
          isReadByCurrentUser
        };
      });

      const unreadCount = synthesized.filter((item) => !item.isReadByCurrentUser).length;
      return res.status(200).json({ notifications: synthesized, unreadCount });
    }

    const normalizedNotifications = notifications.map((item) => {
      const notificationKey = `notif:${item._id}`;
      const isReadByCurrentUser = Boolean(
        receiptKeySet.has(notificationKey) || (item.isRead && String(item.readByUserId || "") === currentUserId)
      );
      return {
        ...item,
        isReadByCurrentUser
      };
    });

    const unreadCount = normalizedNotifications.filter((item) => !item.isReadByCurrentUser).length;

    res.status(200).json({ notifications: normalizedNotifications, unreadCount });
  } catch (error) {
    console.error("Error fetching notifications:", error.message);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.post("/notifications/read-all", authMiddleware, async (req, res) => {
  try {
    const currentUserId = String(req.user?.id || req.user?._id || "");
    const now = new Date();

    const result = await Notification.updateMany(
      {
        targetRole: "student",
        $or: [
          { isRead: { $ne: true } },
          { readByUserId: { $ne: currentUserId } }
        ]
      },
      {
        $set: {
          isRead: true,
          readAt: now,
          readByUserId: currentUserId
        }
      }
    );

    const allNotifications = await Notification.find({ targetRole: "student" }).select("_id").lean();
    const allMenus = await Menu.find({}).select("_id").lean();
    const bulkOps = [
      ...allNotifications.map((item) => ({
        updateOne: {
          filter: { userId: currentUserId, notificationKey: `notif:${item._id}` },
          update: { $set: { readAt: now } },
          upsert: true
        }
      })),
      ...allMenus.map((menu) => ({
        updateOne: {
          filter: { userId: currentUserId, notificationKey: `menu:${menu._id}` },
          update: { $set: { readAt: now } },
          upsert: true
        }
      }))
    ];

    if (bulkOps.length > 0) {
      await NotificationRead.bulkWrite(bulkOps, { ordered: false });
    }

    res.status(200).json({
      message: "All notifications marked as read",
      updatedCount: result.modifiedCount || 0
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error.message);
    res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

router.post("/notifications/:id/read", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = String(req.user?.id || req.user?._id || "");
    const now = new Date();

    // Virtual notifications are backed by menu records, so persist read receipt by menu key.
    if (String(id).startsWith("menu-")) {
      const menuId = String(id).replace("menu-", "");
      await NotificationRead.findOneAndUpdate(
        { userId: currentUserId, notificationKey: `menu:${menuId}` },
        { $set: { readAt: now } },
        { upsert: true, new: true }
      );

      return res.status(200).json({ message: "Virtual notification marked as read" });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      {
        $set: {
          isRead: true,
          readAt: now,
          readByUserId: currentUserId
        }
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await NotificationRead.findOneAndUpdate(
      { userId: currentUserId, notificationKey: `notif:${id}` },
      { $set: { readAt: now } },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Error marking notification as read:", error.message);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// add menu (admin only)
router.post("/add", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { date, breakfast, lunch, dinner } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    // Accept both formats: items object or breakfast/lunch/dinner directly
    let items = req.body.items;
    if (!items && (breakfast || lunch || dinner)) {
      items = { breakfast, lunch, dinner };
    }

    if (!items) {
      return res.status(400).json({ error: "Items are required" });
    }

    const menu = await Menu.create({ date, items });

    // Clear cache for this date
    await deleteCache(`menu:${date}`);

    await publishMenuNotification({
      type: "menu-added",
      title: "New Menu Added",
      message: `Admin added menu for ${date}. Check the latest meals.`,
      menuDate: date,
      createdBy: req.user?.id
    });

    res.status(201).json({ message: "Menu added", menu });
  } catch (error) {
    console.error("Error adding menu:", error.message);
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Menu already available for this date'
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// get menu by date (public)
router.get("/:date", async (req, res) => {
  try {
    const cacheKey = `menu:${req.params.date}`;
    
    // Check Redis cache first
    const cachedMenu = await getCache(cacheKey);
    if (cachedMenu) {
      console.log(`[OK] Menu cache hit for ${req.params.date}`);
      return res.json(cachedMenu);
    }

    // If not in cache, fetch from database
    const menu = await Menu.findOne({ date: req.params.date });

    if (!menu) {
      return res.status(404).json({ message: "Menu not found for this date" });
    }

    // Format response
    const menuData = {
      date: menu.date,
      breakfast: menu.items.breakfast || [],
      lunch: menu.items.lunch || [],
      dinner: menu.items.dinner || []
    };

    // Store in cache for 24 hours (86400 seconds)
    await setCache(cacheKey, menuData, 86400);
    console.log(`[OK] Menu cached for ${req.params.date}`);

    res.json(menuData);
  } catch (error) {
    console.error("Error fetching menu:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// get menu by date (public) - /get/:date variant
router.get("/get/:date", async (req, res) => {
  try {
    const cacheKey = `menu:${req.params.date}`;
    
    // Check Redis cache first
    const cachedMenu = await getCache(cacheKey);
    if (cachedMenu) {
      console.log(`[OK] Menu cache hit for ${req.params.date}`);
      return res.json({
        date: cachedMenu.date,
        items: {
          breakfast: cachedMenu.breakfast,
          lunch: cachedMenu.lunch,
          dinner: cachedMenu.dinner
        }
      });
    }

    // If not in cache, fetch from database
    const menu = await Menu.findOne({ date: req.params.date });

    if (!menu) {
      return res.status(404).json({ message: "Menu not found for this date" });
    }

    // Store in cache for 24 hours
    const menuData = {
      date: menu.date,
      breakfast: menu.items.breakfast || [],
      lunch: menu.items.lunch || [],
      dinner: menu.items.dinner || []
    };
    await setCache(cacheKey, menuData, 86400);
    console.log(`[OK] Menu cached for ${req.params.date}`);

    res.json({
      date: menu.date,
      items: menu.items
    });
  } catch (error) {
    console.error("Error fetching menu:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// update menu (admin only)
router.put("/update", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { date, breakfast, lunch, dinner } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    // Accept both formats: items object or breakfast/lunch/dinner directly
    let items = req.body.items;
    if (!items && (breakfast || lunch || dinner)) {
      items = { breakfast, lunch, dinner };
    }

    if (!items) {
      return res.status(400).json({ error: "Items are required" });
    }

    const updatedMenu = await Menu.findOneAndUpdate(
      { date },
      { items },
      { new: true }
    );

    if (!updatedMenu) {
      return res.status(404).json({ message: "Menu not found for this date" });
    }

    // Clear cache for this date
    await deleteCache(`menu:${date}`);
    console.log(`[OK] Menu cache cleared for ${date}`);

    await publishMenuNotification({
      type: "menu-updated",
      title: "Menu Updated",
      message: `Admin updated menu for ${date}. Please review your meal options.`,
      menuDate: date,
      createdBy: req.user?.id
    });

    res.status(200).json({ message: "Menu updated", menu: updatedMenu });
  } catch (error) {
    console.error("Error updating menu:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// delete menu (admin only)
router.delete("/delete", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const deletedMenu = await Menu.findOneAndDelete({ date });

    if (!deletedMenu) {
      return res.status(404).json({ message: "Menu not found for this date" });
    }

    // Clear cache for this date
    await deleteCache(`menu:${date}`);
    console.log(`[OK] Menu cache cleared for ${date}`);

    await publishMenuNotification({
      type: "menu-deleted",
      title: "Menu Removed",
      message: `Admin removed menu for ${date}. You may need to recheck upcoming meals.`,
      menuDate: date,
      createdBy: req.user?.id
    });

    res.status(200).json({ message: "Menu deleted successfully", menu: deletedMenu });
  } catch (error) {
    console.error("Error deleting menu:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
