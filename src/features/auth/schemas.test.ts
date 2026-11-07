import test from "node:test";
import assert from "node:assert/strict";
import { loginSchema, changePasswordSchema } from "./schemas";

test("loginSchema passes with valid credentials", () => {
  const result = loginSchema.safeParse({
    email: "owner@warungberkah.id",
    password: "password123",
  });
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.email, "owner@warungberkah.id");
    assert.strictEqual(result.data.password, "password123");
  }
});

test("loginSchema fails with invalid email format", () => {
  const result = loginSchema.safeParse({
    email: "not-an-email",
    password: "password123",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const emailError = result.error.issues.find((i) => i.path[0] === "email");
    assert.ok(emailError);
    assert.strictEqual(emailError.message, "Format email tidak valid");
  }
});

test("loginSchema fails when password is shorter than 6 characters", () => {
  const result = loginSchema.safeParse({
    email: "valid@email.com",
    password: "12345",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const passwordError = result.error.issues.find((i) => i.path[0] === "password");
    assert.ok(passwordError);
    assert.strictEqual(passwordError.message, "Password minimal 6 karakter");
  }
});

test("changePasswordSchema passes when passwords match and are at least 8 characters", () => {
  const result = changePasswordSchema.safeParse({
    passwordBaru: "Katasandi123!",
    konfirmasiPasswordBaru: "Katasandi123!",
  });
  assert.strictEqual(result.success, true);
});

test("changePasswordSchema fails when password is shorter than 8 characters", () => {
  const result = changePasswordSchema.safeParse({
    passwordBaru: "pendek",
    konfirmasiPasswordBaru: "pendek",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const err = result.error.issues.find((i) => i.path[0] === "passwordBaru");
    assert.ok(err);
    assert.strictEqual(err.message, "Password baru minimal 8 karakter");
  }
});

test("changePasswordSchema fails when passwords do not match", () => {
  const result = changePasswordSchema.safeParse({
    passwordBaru: "passwordBaru123",
    konfirmasiPasswordBaru: "passwordLain456",
  });
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const err = result.error.issues.find((i) => i.path[0] === "konfirmasiPasswordBaru");
    assert.ok(err);
    assert.strictEqual(err.message, "Konfirmasi password tidak cocok");
  }
});
