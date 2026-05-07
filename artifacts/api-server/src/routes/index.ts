import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tenantsRouter, { publicRouter as invitationsPublicRouter } from "./tenants";
import vehiclesRouter from "./vehicles";
import driversRouter from "./drivers";
import routesRouter from "./routes";
import studentsRouter from "./students";
import tripsRouter from "./trips";
import incidentsRouter from "./incidents";
import maintenanceRouter from "./maintenance";
import dashboardRouter from "./dashboard";
import superAdminRouter from "./superAdmin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(invitationsPublicRouter);
router.use(tenantsRouter);
router.use(vehiclesRouter);
router.use(driversRouter);
router.use(routesRouter);
router.use(studentsRouter);
router.use(tripsRouter);
router.use(incidentsRouter);
router.use(maintenanceRouter);
router.use(dashboardRouter);
router.use(superAdminRouter);

export default router;
