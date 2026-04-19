import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { getDebugUserId } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";

export function SignInPage() {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password
      });

      if (result.error) {
        setError(result.error.message ?? "Unable to sign in. Please try again.");
        return;
      }

      navigate(redirectTarget, { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Unable to sign in. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="ff-auth-page ff-page relative w-full">
      <div className="ff-shell">
        <div className="ff-auth-grid min-h-[calc(100svh-18rem)]">
          <div className="max-w-xl space-y-4">
            <p className="ff-kicker">Account Access</p>
            <h1 className="ff-display text-5xl text-on-surface md:text-6xl">Sign in</h1>
            <div className="h-[2px] w-12 bg-primary" />
            <p className="max-w-lg text-base leading-7 text-on-surface-variant md:text-lg">
              Use your email and password to manage leagues, edit race cards, and review results.
            </p>
          </div>

          <div className="mx-auto w-full max-w-xl">
            <Card className="ff-table-card ">
              <CardContent className="space-y-6 px-8 py-8">
                <div className="space-y-2">
                  <p className="text-base font-medium text-on-surface">Welcome back.</p>
                  <p className="text-sm leading-6 text-on-surface-variant">
                    Sign in to continue to your leagues and predictions.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="ff-field-shell">
                    <Label htmlFor="signInEmail">Email</Label>
                    <Input
                      id="signInEmail"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      spellCheck={false}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>

                  <div className="ff-field-shell">
                    <Label htmlFor="signInPassword">Password</Label>
                    <Input
                      id="signInPassword"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password…"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>

                  {error ? (
                    <p className="bg-error-container px-4 py-3 text-sm text-on-error-container">
                      {error}
                    </p>
                  ) : null}

                  <Button type="submit" className="w-full" size="lg" disabled={isPending || isSubmitting}>
                    {isSubmitting ? "Signing in…" : "Sign in"}
                  </Button>
                </form>

                <div className=" pt-6 text-center">
                  <p className="text-sm text-on-surface-variant">
                    New to Formula Fantasy?
                  </p>
                  <Button asChild variant="outline" className="mt-4 w-full">
                    <Link
                      to={redirectTarget === "/" ? "/sign-up" : `/sign-up?redirect=${encodeURIComponent(redirectTarget)}`}
                    >
                      Create account
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
