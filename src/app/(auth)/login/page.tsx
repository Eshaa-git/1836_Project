import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FormAlert } from "@/features/auth/components/form-alert";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, reset } = await searchParams;
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to pick up where you left off."
      footer={
        <p>
          New here?{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {reset && <FormAlert tone="success" message="Your password was updated. Sign in with the new one." />}
        <SignInForm next={typeof next === "string" ? next : undefined} />
      </div>
    </AuthCard>
  );
}
