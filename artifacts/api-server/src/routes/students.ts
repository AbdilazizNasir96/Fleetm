import { Router } from "express";
import { db } from "@workspace/db";
import { students, parents, studentParents, users, schools } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { inviteUser } from "../lib/invite";
import {
  CreateStudentBody,
  UpdateStudentBody,
  GetStudentParams,
  UpdateStudentParams,
  DeleteStudentParams,
  ListStudentsQueryParams,
  CreateParentBody,
  UpdateParentBody,
  ListParentStudentsParams,
  LinkStudentToParentParams,
  LinkStudentToParentBody,
  GetParentParams,
  DeleteParentParams,
} from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

// ─── Students ─────────────────────────────────────────────────────────────

router.get("/students", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const query = ListStudentsQueryParams.safeParse(req.query);

  let rows = await db
    .select({
      id: students.id,
      tenantId: students.tenantId,
      firstName: students.firstName,
      lastName: students.lastName,
      schoolId: students.schoolId,
      schoolName: students.schoolName,
      grade: students.grade,
      homeStopId: students.homeStopId,
      boardingTime: students.boardingTime,
      alightingTime: students.alightingTime,
      emergencyContact: students.emergencyContact,
      specialNeeds: students.specialNeeds,
    })
    .from(students)
    .where(eq(students.tenantId, tenantId));

  if (query.success && query.data.search) {
    const search = query.data.search.toLowerCase();
    rows = rows.filter(s =>
      s.firstName.toLowerCase().includes(search) ||
      s.lastName.toLowerCase().includes(search) ||
      (s.schoolName?.toLowerCase().includes(search) ?? false)
    );
  }

  if (query.success && query.data.routeId) {
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
      address: parents.address,
      createdAt: parents.createdAt,
      updatedAt: parents.updatedAt,
      fullName: users.fullName,
      email: users.email,
    })
    .from(studentParents)
    .innerJoin(parents, eq(studentParents.parentId, parents.id))
    .innerJoin(users, eq(parents.userId, users.id))
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

// ─── Parents ──────────────────────────────────────────────────────────────

async function parentWithUser(tenantId: string, parentId: string) {
  const [row] = await db
    .select({
      id: parents.id,
      tenantId: parents.tenantId,
      userId: parents.userId,
      phone: parents.phone,
      address: parents.address,
      createdAt: parents.createdAt,
      updatedAt: parents.updatedAt,
      fullName: users.fullName,
      email: users.email,
    })
    .from(parents)
    .innerJoin(users, eq(parents.userId, users.id))
    .where(and(eq(parents.id, parentId), eq(parents.tenantId, tenantId)));
  return row ?? null;
}

router.get("/parents", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const rows = await db
    .select({
      id: parents.id,
      tenantId: parents.tenantId,
      userId: parents.userId,
      phone: parents.phone,
      address: parents.address,
      createdAt: parents.createdAt,
      updatedAt: parents.updatedAt,
      fullName: users.fullName,
      email: users.email,
    })
    .from(parents)
    .innerJoin(users, eq(parents.userId, users.id))
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
  const inviterId = req.user!.userId;
  const { email, fullName, phone, address } = parsed.data;

  // Check if user already has a parent record in this tenant
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existingUser) {
    const [existingParent] = await db
      .select({ id: parents.id })
      .from(parents)
      .where(and(eq(parents.userId, existingUser.id), eq(parents.tenantId, tenantId)));
    if (existingParent) {
      res.status(409).json({ error: "A parent record already exists for this email in this tenant" });
      return;
    }
  }

  // Invite (find-or-create user, upsert tenant membership, send email)
  const { userId } = await inviteUser({
    email,
    fullName: fullName ?? null,
    role: "parent",
    tenantId,
    inviterUserId: inviterId,
  });

  // Create parent record
  const [inserted] = await db
    .insert(parents)
    .values({ userId, tenantId, phone: phone ?? null, address: address ?? null })
    .returning({ id: parents.id });

  const parent = await parentWithUser(tenantId, inserted.id);
  res.status(201).json({
    ...parent,
    invitationSent: true,
    message: `Invitation sent to ${email}. They will be able to set their password and log in.`,
  });
});

router.get("/parents/:parentId", async (req, res): Promise<void> => {
  const params = GetParentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const parent = await parentWithUser(tenantId, params.data.parentId);
  if (!parent) {
    res.status(404).json({ error: "Parent not found" });
    return;
  }
  res.json(parent);
});

router.patch("/parents/:parentId", async (req, res): Promise<void> => {
  const params = GetParentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateParentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [updated] = await db
    .update(parents)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(parents.id, params.data.parentId), eq(parents.tenantId, tenantId)))
    .returning({ id: parents.id });
  if (!updated) {
    res.status(404).json({ error: "Parent not found" });
    return;
  }
  const parent = await parentWithUser(tenantId, updated.id);
  res.json(parent);
});

router.delete("/parents/:parentId", async (req, res): Promise<void> => {
  const params = DeleteParentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [deleted] = await db
    .delete(parents)
    .where(and(eq(parents.id, params.data.parentId), eq(parents.tenantId, tenantId)))
    .returning({ id: parents.id });
  if (!deleted) {
    res.status(404).json({ error: "Parent not found" });
    return;
  }
  res.sendStatus(204);
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
      schoolId: students.schoolId,
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
