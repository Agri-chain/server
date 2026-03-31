import express from "express";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware.js";
import { restrictToVerified, restrictToRole } from "../middleware/access.middleware.js";

const router = express.Router();

// All logistics routes require verified user
router.use(verifyToken);
router.use(restrictToVerified);

// Order management routes require verified logistics
router.post("/orders", restrictToRole('logistics'), (req, res) => {
    res.json({
        message: "Order assigned successfully",
        orderId: "LOG-" + Date.now()
    });
});

router.get("/dashboard", (req, res) => {
    res.json({
        message: "Logistics dashboard",
        user: req.user
    });
});

export default router;
