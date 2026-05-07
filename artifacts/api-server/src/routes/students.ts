import { Router } from "express";
import { db } from "@workspace/db";
import { students, parents, studentParents, users } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  CreateStudentBody,
  UpdateStudentBody,
  GetStudentParams,
  UpdateStudentParams,
  DeleteStudentParams,
  ListStudentsQueryParams,
  CreateParentBody,
  ListParentStudentsParams,
  LinkStudentToParentParams,
  LinkStudentToParentBody,
} from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

// Students
router.get("/students", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const query = ListStudentsQueryParams.safeParse(req.query);

  let rows = await db.select().from(students).where(eq(students.tenantId, tenantId));

  if (query.success && query.data.search) {
    const search = query.data.search.toLowerCase();
    rows = rows.filter(s =>
      s.firstName.toLowerCase().includes(search) ||
      s.lastName.toLowerCase().includes(search) ||
      (s.schoolName?.toLowerCase().includes(search) ?? false)
    );
  }

  if (query.success && query.data.routeId) {
    // Filter by students assigned to stops on this route - simplified
    rows = rows.filter(s => s.homeStopId !== null);
  }

  res.json(rows);
});

router.post("/students", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [student] = await db.insert(students).values({ ...parsed.data, tenantId }).returning();
  res.status(201).json(student);
});

router.get("/students/:studentId", async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [student] = await db.select().from(students).where(
    and(eq(students.id, params.data.studentId), eq(students.tenantId, tenantId))
  );
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const studentParentRows = await db
    .select({
      id: parents.id,
      tenantId: parents.tenantId,
      userId: parents.userId,
      phone: parents.phone,
      fullName: users.fullName,
      email: users.email,
    })
    .from(studentParents)
    .innerJoin(parents, eq(studentParents.parentId, parents.id))
    .leftJoin(users, eq(parents.userId, users.id))
    .where(eq(studentParents.studentId, student.id));

  res.json({ ...student, parents: studentParentRows });
});

router.patch("/students/:studentId", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [student] = await db.update(students)
    .set(parsed.data)
    .where(and(eq(students.id, params.data.studentId), eq(students.tenantId, tenantId)))
    .returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json(student);
});

router.delete("/students/:studentId", async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [student] = await db.delete(students)
    .where(and(eq(students.id, params.data.studentId), eq(students.tenantId, tenantId)))
    .returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.sendStatus(204);
});

// Parents
router.get("/parents", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const rows = await db
    .select({
      id: parents.id,
      tenantId: parents.tenantId,
      userId: parents.userId,
      phone: parents.phone,
      fullName: users.fullName,
      email: users.email,
    })
    .from(parents)
    .leftJoin(users, eq(parents.userId, users.id))
    .where(eq(parents.tenantId, tenantId));
  res.json(rows);
});

router.post("/parents", async (req, res): Promise<void> => {
  const parsed = CreateParentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [parent] = await db.insert(parents).values({ ...parsed.data, tenantId }).returning();
  res.status(201).json(parent);
});

router.get("/parents/:parentId/students", async (req, res): Promise<void> => {
  const params = ListParentStudentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const rows = await db
    .select({
      id: students.id,
      tenantId: students.tenantId,
      firstName: students.firstName,
      lastName: students.lastName,
      schoolName: students.schoolName,
      grade: students.grade,
      homeStopId: students.homeStopId,
      emergencyContact: students.emergencyContact,
      specialNeeds: students.specialNeeds,
    })
    .from(studentParents)
    .innerJoin(students, eq(studentParents.studentId, students.id))
    .where(and(eq(studentParents.parentId, params.data.parentId), eq(students.tenantId, tenantId)));
  res.json(rows);
});

router.post("/parents/:parentId/students", async (req, res): Promise<void> => {
  const params = LinkStudentToParentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = LinkStudentToParentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.insert(studentParents).values({
    parentId: params.data.parentId,
    studentId: parsed.data.studentId,
  }).onConflictDoNothing();
  res.status(201).json({ message: "Student linked to parent" });
});

export default router;
