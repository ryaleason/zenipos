import test from "node:test";
import assert from "node:assert/strict";
import {
  createUmkmSchema,
  extendSubscriptionSchema,
  toggleStatusSchema,
  resetPasswordSchema,
} from "./schemas";

test("createUmkmSchema passes with valid input", () => {
  const result = createUmkmSchema.safeParse({
    name: "Warung Berkah",
    owner_name: "Pak Budi",
    phone: "081234567890",
    email: "budi@berkah.id",
    initial_password: "password123",
    address: "Jl. Merdeka No. 10",
  });
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.name, "Warung Berkah");
    assert.strictEqual(result.data.owner_name, "Pak Budi");
    assert.strictEqual(result.data.phone, "081234567890");
    assert.strictEqual(result.data.email, "budi@berkah.id");
    assert.strictEqual(result.data.initial_password, "password123");
  }
});

test("createUmkmSchema fails when name is less than 2 characters", () => {
  const result = createUmkmSchema.safeParse({
    name: "W",
    owner_name: "Pak Budi",
    phone: "081234567890",
    email: "budi@berkah.id",
    initial_password: "password123",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const issue = result.error.issues.find((i) => i.path[0] === "name");
    assert.ok(issue);
    assert.strictEqual(issue.message, "Nama UMKM minimal 2 karakter");
  }
});

test("createUmkmSchema fails when owner_name is less than 2 characters", () => {
  const result = createUmkmSchema.safeParse({
    name: "Warung Berkah",
    owner_name: "P",
    phone: "081234567890",
    email: "budi@berkah.id",
    initial_password: "password123",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const issue = result.error.issues.find((i) => i.path[0] === "owner_name");
    assert.ok(issue);
    assert.strictEqual(issue.message, "Nama pemilik minimal 2 karakter");
  }
});

test("createUmkmSchema fails when phone is less than 9 characters", () => {
  const result = createUmkmSchema.safeParse({
    name: "Warung Berkah",
    owner_name: "Pak Budi",
    phone: "0812345",
    email: "budi@berkah.id",
    initial_password: "password123",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const issue = result.error.issues.find((i) => i.path[0] === "phone");
    assert.ok(issue);
    assert.strictEqual(issue.message, "Nomor telepon minimal 9 karakter");
  }
});

test("createUmkmSchema fails when email is invalid", () => {
  const result = createUmkmSchema.safeParse({
    name: "Warung Berkah",
    owner_name: "Pak Budi",
    phone: "081234567890",
    email: "budi-bukan-email",
    initial_password: "password123",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const issue = result.error.issues.find((i) => i.path[0] === "email");
    assert.ok(issue);
    assert.strictEqual(issue.message, "Format email tidak valid");
  }
});

test("createUmkmSchema fails when initial_password is shorter than 8 characters", () => {
  const result = createUmkmSchema.safeParse({
    name: "Warung Berkah",
    owner_name: "Pak Budi",
    phone: "081234567890",
    email: "budi@berkah.id",
    initial_password: "1234567",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const issue = result.error.issues.find((i) => i.path[0] === "initial_password");
    assert.ok(issue);
    assert.strictEqual(issue.message, "Password awal minimal 8 karakter");
  }
});

test("extendSubscriptionSchema passes with valid UUID", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";
  const result = extendSubscriptionSchema.safeParse({ umkm_id: validUuid });
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.umkm_id, validUuid);
  }
});

test("extendSubscriptionSchema fails with invalid UUID", () => {
  const result = extendSubscriptionSchema.safeParse({ umkm_id: "not-a-uuid" });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const issue = result.error.issues.find((i) => i.path[0] === "umkm_id");
    assert.ok(issue);
    assert.strictEqual(issue.message, "ID UMKM tidak valid");
  }
});

test("toggleStatusSchema passes with valid statuses", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";
  const activeResult = toggleStatusSchema.safeParse({
    umkm_id: validUuid,
    status: "active",
  });
  assert.strictEqual(activeResult.success, true);

  const inactiveResult = toggleStatusSchema.safeParse({
    umkm_id: validUuid,
    status: "inactive",
  });
  assert.strictEqual(inactiveResult.success, true);
});

test("toggleStatusSchema fails with invalid status", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";
  const result = toggleStatusSchema.safeParse({
    umkm_id: validUuid,
    status: "suspended",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const issue = result.error.issues.find((i) => i.path[0] === "status");
    assert.ok(issue);
    assert.strictEqual(issue.message, "Status harus active atau inactive");
  }
});

test("resetPasswordSchema passes with valid profile_id and password", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";
  const result = resetPasswordSchema.safeParse({
    profile_id: validUuid,
    new_password: "NewSecretPassword123!",
  });
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.profile_id, validUuid);
    assert.strictEqual(result.data.new_password, "NewSecretPassword123!");
  }
});

test("resetPasswordSchema fails with invalid profile_id UUID", () => {
  const result = resetPasswordSchema.safeParse({
    profile_id: "invalid-uuid",
    new_password: "NewSecretPassword123!",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const issue = result.error.issues.find((i) => i.path[0] === "profile_id");
    assert.ok(issue);
    assert.strictEqual(issue.message, "ID profil tidak valid");
  }
});

test("resetPasswordSchema fails when new_password is shorter than 8 characters", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";
  const result = resetPasswordSchema.safeParse({
    profile_id: validUuid,
    new_password: "short",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const issue = result.error.issues.find((i) => i.path[0] === "new_password");
    assert.ok(issue);
    assert.strictEqual(issue.message, "Password baru minimal 8 karakter");
  }
});
