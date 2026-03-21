import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { getDebugUserId } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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
      setError(getErrorMessage(err, "Unable to sign in. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="ff-auth-page ff-page relative w-full">
      <div className="ff-shell">
        <div className="ff-auth-grid min-h-[calc(100svh-16rem)]">
          <div className="space-y-8">
            <div className="ff-section-title">
              <p className="ff-display text-4xl text-[#f20b0b] md:text-6xl">Formula Fantasy</p>
              <div className="h-px w-28 bg-[#cc0000]" />
              <p className="ff-kicker">Paddock Access</p>
              <p className="ff-display max-w-xl text-5xl text-white md:text-7xl">
                Start Engine
              </p>
              <p className="max-w-xl text-lg leading-8 text-[#b8bac2]">
                Re-enter the grid, confirm the next race window, and get back into
                prediction flow before lights out.
              </p>
            </div>

            <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
              <div className="ff-field-shell">
                <p className="ff-kicker">Secure entry</p>
                <p className="mt-3 text-sm text-[#b8bac2]">
                  Protected session and account controls.
                </p>
              </div>
              <div className="ff-field-shell">
                <p className="ff-kicker">League ready</p>
                <p className="mt-3 text-sm text-[#b8bac2]">
                  Jump back into leagues, results, and race cards.
                </p>
              </div>
              <div className="ff-field-shell">
                <p className="ff-kicker">Live window</p>
                <p className="mt-3 text-sm text-[#b8bac2]">
                  Real-time access to current prediction status.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl">
            <Card className="ff-table-card overflow-hidden border-white/8">
              <div className="ff-panel-strip">
                <span className="ff-kicker">Auth Protocol // 01</span>
                <span className="h-2 w-2 rounded-full bg-[#cc0000]" />
              </div>
              <CardHeader className="space-y-3 pb-4">
                <CardTitle className="text-3xl md:text-4xl">Sign In</CardTitle>
                <p className="text-sm leading-6 text-[#989aa2]">
                  Welcome back. Sign in to manage your leagues and predictions.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="ff-field-shell">
                    <Label htmlFor="signInEmail">Grid Identity (Email)</Label>
                    <Input
                      id="signInEmail"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>

                  <div className="ff-field-shell">
                    <Label htmlFor="signInPassword">Secure Key (Password)</Label>
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
                    <p className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                      {error}
                    </p>
                  ) : null}

                  <Button type="submit" className="w-full" size="lg" disabled={isPending || isSubmitting}>
                    {isSubmitting ? "Signing in..." : "Start Engine"}
                  </Button>
                </form>

                <div className="border-t border-white/6 pt-6 text-center">
                  <p className="text-sm text-[#7f828b]">
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
