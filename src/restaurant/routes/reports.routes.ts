import { Router } from "express";
import { dailyReport } from "../controllers/reports.controller";

const router = Router();

router.get("/daily", dailyReport);

export default router;
