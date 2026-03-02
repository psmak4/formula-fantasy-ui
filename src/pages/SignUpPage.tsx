import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useSignUp } from "@clerk/clerk-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClerkErrorLike = {
  errors?: Array<{
    message?: string;
    longMessage?: string;
  }>;
};

function getClerkErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "errors" in error) {
    const errors = (error as ClerkErrorLike).errors;
    const first = errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
  }
  if (error instanceof Error) return error.message;
  return "Unable to sign up. Please try again.";
}

export function SignUpPage() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { isLoaded, signUp, setActive } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      navigate("/", { replace: true });
    }
  }, [isSignedIn, navigate]);

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate("/", { replace: true });
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setIsVerifying(true);
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const verification = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (verification.status !== "complete" || !verification.createdSessionId) {
        setError("Verification is not complete yet. Check the code and try again.");
        return;
      }

      await setActive({ session: verification.createdSessionId });
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    if (!isLoaded || !signUp) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full bg-white py-16">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="mx-auto w-full max-w-lg">
          <Card className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <div className="h-[3px] w-full bg-red-600" />
            <CardHeader className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight text-neutral-900">
                Sign up
              </CardTitle>
              <p className="text-sm text-slate-600">
                Create your account to start leagues and submit race predictions.
              </p>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="mb-4 w-full"
                onClick={handleGoogleSignUp}
                disabled={!isLoaded || isSubmitting}
              >
                Continue with Google
              </Button>

              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-200" />
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  or
                </span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>

              {!isVerifying ? (
                <form className="space-y-4" onSubmit={handleCreateAccount}>
                  <div className="space-y-2">
                    <Label htmlFor="signUpEmail">Email</Label>
                    <Input
                      id="signUpEmail"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signUpPassword">Password</Label>
                    <Input
                      id="signUpPassword"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={8}
                      required
                    />
                  </div>

                  {error ? (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </p>
                  ) : null}

                  <Button type="submit" className="w-full" disabled={!isLoaded || isSubmitting}>
                    {isSubmitting ? "Creating account..." : "Create account"}
                  </Button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleVerifyCode}>
                  <div className="space-y-2">
                    <Label htmlFor="verificationCode">Verification code</Label>
                    <Input
                      id="verificationCode"
                      type="text"
                      autoComplete="one-time-code"
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value)}
                      placeholder="Enter code from your email"
                      required
                    />
                  </div>

                  {error ? (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Check your email for a verification code.
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={!isLoaded || isSubmitting}>
                    {isSubmitting ? "Verifying..." : "Verify and continue"}
                  </Button>
                </form>
              )}

              <p className="mt-4 text-sm text-slate-600">
                Already have an account?{" "}
                <Link to="/sign-in" className="font-medium text-red-600 hover:text-red-700">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
