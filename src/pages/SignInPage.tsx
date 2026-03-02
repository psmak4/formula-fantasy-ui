import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useSignIn } from "@clerk/clerk-react";
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
  return "Unable to sign in. Please try again.";
}

export function SignInPage() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      navigate("/", { replace: true });
    }
  }, [isSignedIn, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status !== "complete" || !result.createdSessionId) {
        setError("Additional authentication is required to finish signing in.");
        return;
      }

      await setActive({ session: result.createdSessionId });
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await signIn.authenticateWithRedirect({
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
                Sign in
              </CardTitle>
              <p className="text-sm text-slate-600">
                Welcome back. Sign in to manage your leagues and predictions.
              </p>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="mb-4 w-full"
                onClick={handleGoogleSignIn}
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

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="signInEmail">Email</Label>
                  <Input
                    id="signInEmail"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signInPassword">Password</Label>
                  <Input
                    id="signInPassword"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>

                {error ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" disabled={!isLoaded || isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              <p className="mt-4 text-sm text-slate-600">
                New to Formula Fantasy?{" "}
                <Link to="/sign-up" className="font-medium text-red-600 hover:text-red-700">
                  Create an account
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
