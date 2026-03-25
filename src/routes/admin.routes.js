import express from "express";
import { getAllUsers, getDashboardStats, deleteUser, toggleUserVerification, toggleUserBan } from "../controllers/admin.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Admin routes require admin role
router.use(verifyToken);
router.use(authorizeRoles('admin'));

// User management routes
router.get("/users", getAllUsers);

// Dashboard statistics
router.get("/dashboard-stats", getDashboardStats);

// Delete user
router.delete("/users/:id", deleteUser);

// Toggle user verification
router.patch("/users/:id/verify", toggleUserVerification);

// Ban/Unban user
router.patch("/users/:id/ban", toggleUserBan);

export default router;
