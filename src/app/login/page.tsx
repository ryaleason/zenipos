import type { Metadata } from "next";
import AuthBasic from "@/components/kokonutui/auth-basic";

export const metadata: Metadata = {
  title: "Login | Zenipos",
  description: "Sign in with your credentials or Google account",
};

export default function LoginPage() {
  return <AuthBasic />;
}
