import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormAlert({
  message,
  tone = "error",
}: {
  message: string | null;
  tone?: "error" | "success";
}) {
  if (!message) return null;
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <Alert
      variant={tone === "error" ? "destructive" : "default"}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
