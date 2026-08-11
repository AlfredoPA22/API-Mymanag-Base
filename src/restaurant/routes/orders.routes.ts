import { Router } from "express";
import { listOrders, createOrder, updateOrderEstado } from "../controllers/orders.controller";

const router = Router();

router.get("/", listOrders);
router.post("/", createOrder);
router.patch("/:id/estado", updateOrderEstado);

export default router;
