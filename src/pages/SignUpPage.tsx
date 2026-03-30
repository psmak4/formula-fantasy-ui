import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { getDebugUserId } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const debugUserId = getDebugUserId();
  const hasDebugAuth =
    import.meta.env.DEV &&
    import.meta.env.VITE_ALLOW_DEBUG_AUTH === "true" &&
    debugUserId.length > 0;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirect = new URLSearchParams(location.search).get("redirect");
  const redirectTarget =
    redirect && redirect.startsWith("/") ? redirect : "/";

  useEffect(() => {
    if (session?.user || hasDebugAuth) {
      navigate(redirectTarget, { replace: true });
    }
  }, [hasDebugAuth, navigate, redirectTarget, session]);

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const emailTrimmed = email.trim();
      const result = await authClient.signUp.email({
        email: emailTrimmed,
        password,
        name: emailTrimmed.split("@")[0] ?? emailTrimmed
      });

      if (result.error) {
        setError(result.error.message ?? "Unable to sign up. Please try again.");
        return;
      }

      navigate(redirectTarget, { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to sign up. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="ff-page ff-auth-page relative w-full">
      <div className="ff-shell">
        <div className="ff-auth-grid min-h-[calc(100svh-18rem)]">
          <div className="max-w-xl space-y-4">
            <p className="ff-kicker">Account Setup</p>
            <h1 className="ff-display text-5xl text-[#111318] md:text-6xl">Create account</h1>
            <p className="max-w-lg text-base leading-7 text-[#66707d] md:text-lg">
              Create your account to join leagues, build race cards, and track your results through the season.
            </p>
          </div>

          <div className="mx-auto w-full max-w-xl">
            <Card className="ff-table-card border-[#d9dee5]">
              <CardContent className="space-y-6 px-8 py-8">
                <div className="space-y-2">
                  <p className="text-base font-medium text-[#111318]">Start your account.</p>
                  <p className="text-sm leading-6 text-[#66707d]">
                    Use your email and a password to create your Formula Fantasy account.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleCreateAccount}>
                  <div className="ff-field-shell">
                    <Label htmlFor="signUpEmail">Email</Label>
                    <Input
                      id="signUpEmail"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>

                  <div className="ff-field-shell">
                    <Label htmlFor="signUpPassword">Password</Label>
                    <Input
                      id="signUpPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={8}
                      required
                    />
                  </div>

                  {error ? (
                    <p className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                      {error}
                    </p>
                  ) : null}

                  <Button type="submit" className="w-full" size="lg" disabled={isPending || isSubmitting}>
                    {isSubmitting ? "Creating account..." : "Create account"}
                  </Button>
                </form>

                <div className="border-t border-[#e4e8ee] pt-6 text-center">
                  <p className="text-sm text-[#66707d]">
                    Already have an account?
                  </p>
                  <Button asChild variant="outline" className="mt-4 w-full">
                    <Link
                      to={redirectTarget === "/" ? "/sign-in" : `/sign-in?redirect=${encodeURIComponent(redirectTarget)}`}
                    >
                      Sign in
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
