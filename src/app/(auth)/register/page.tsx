import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start simple — you can add more detail whenever you like."
      footer={
        <div className="space-y-2">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-xs">Nourish supports healthy habits. It isn&apos;t medical advice.</p>
        </div>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
