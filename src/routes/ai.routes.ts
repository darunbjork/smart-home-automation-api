import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { processAICommand } from "../controllers/ai.controller";

const router = Router();
router.post("/command", authenticate, processAICommand);
export default router;
