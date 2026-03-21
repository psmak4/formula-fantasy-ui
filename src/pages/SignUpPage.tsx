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
        <div className="ff-auth-grid min-h-[calc(100svh-16rem)]">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="ff-display text-4xl text-[#f20b0b] md:text-7xl">
                Formula Fantasy
              </p>
              <div className="h-px w-28 bg-[#cc0000]" />
              <div className="space-y-4">
                <p className="ff-display max-w-2xl text-5xl text-white md:text-7xl">
                  Join The Grid
                </p>
                <p className="max-w-2xl text-lg leading-8 text-[#b8bac2]">
                  Build your account, enter leagues, and track your season race
                  by race without changing any of the core game flow.
                </p>
              </div>
            </div>

            <div className="ff-panel-strip max-w-4xl">
              <div className="ff-field-shell">
                <p className="ff-kicker">Prediction cards</p>
                <p className="mt-3 text-sm text-[#b8bac2]">
                  Lock podium calls and bonus picks before the window closes.
                </p>
              </div>
              <div className="ff-field-shell">
                <p className="ff-kicker">League competition</p>
                <p className="mt-3 text-sm text-[#b8bac2]">
                  Create private leagues or join public grids.
                </p>
              </div>
              <div className="ff-field-shell">
                <p className="ff-kicker">Results tracking</p>
                <p className="mt-3 text-sm text-[#b8bac2]">
                  Review each race and measure your season performance.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl">
            <Card className="overflow-hidden border-white/8 bg-[#18191f]">
              <div className="flex items-center justify-between border-b border-white/6 bg-white/4 px-8 py-4">
                <span className="ff-kicker">Sector 01 // Initialize Profile</span>
                <span className="h-2 w-2 rounded-full bg-[#cc0000]" />
              </div>
              <CardHeader className="space-y-3 pb-4">
                <CardTitle className="text-3xl md:text-4xl">Sign Up</CardTitle>
                <p className="text-sm leading-6 text-[#989aa2]">
                  Create your account to start leagues and submit race predictions.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
              <form className="space-y-4" onSubmit={handleCreateAccount}>
                <div className="space-y-2">
                  <Label htmlFor="signUpEmail">Sector 01: Email Address</Label>
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
                  <Label htmlFor="signUpPassword">Sector 02: Encryption Key</Label>
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
                  <p className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" size="lg" disabled={isPending || isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </form>

                <div className="border-t border-white/6 pt-6 text-center">
                  <p className="text-sm text-[#7f828b]">
                    Already in the paddock?
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
