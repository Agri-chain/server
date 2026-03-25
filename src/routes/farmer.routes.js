import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { restrictToVerified, restrictToRole } from "../middlewares/access.middleware.js";

const router = express.Router();

// All farmer routes require verified user
router.use(verifyToken);
router.use(restrictToVerified);

// Product management routes require verified farmer
router.post("/products", restrictToRole('farmer'), (req, res) => {
    res.json({
        message: "Product added successfully",
        product: req.body
    });
});

router.get("/dashboard", (req, res) => {
    res.json({
        message: "Farmer dashboard",
        user: req.user
    });
});

export default router;
