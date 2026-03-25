import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { restrictToVerified, restrictToRole } from "../middlewares/access.middleware.js";

const router = express.Router();

// All buyer routes require verified user
router.use(verifyToken);
router.use(restrictToVerified);

// Purchase routes require verified buyer
router.post("/purchase", restrictToRole('buyer'), (req, res) => {
    res.json({
        message: "Product purchased successfully",
        orderId: "ORD-" + Date.now()
    });
});

router.get("/dashboard", (req, res) => {
    res.json({
        message: "Buyer dashboard",
        user: req.user
    });
});

export default router;
