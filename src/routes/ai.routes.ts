import { Router } from "express";
import { processAICommand } from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/process", authenticate, processAICommand);

export default router;
