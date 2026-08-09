import { SignUp } from "@clerk/nextjs";
import { authAppearance } from "../../appearance";

export default function SignUpPage() {
  return (
    <SignUp fallbackRedirectUrl="/dashboard" appearance={authAppearance} />
  );
}
