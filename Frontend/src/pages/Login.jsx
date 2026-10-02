import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import "../style/Login.css";
import { useLoginMutation } from "../store/api/AuthApi";
import {
  getAuthApiConfigurationError,
  getAuthApiUnavailableError,
  isAuthApiConfigured,
} from "../config/apiUrls";
import { setCredentials } from "../store/slices/authSlice";
import { setAccessToken, setRefreshToken } from "../store/authToken";

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (retryAfter <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRetryAfter((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [retryAfter]);

  const retryLabel = useMemo(() => {
    const totalSeconds = Math.max(0, Number(retryAfter) || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [retryAfter]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLocked(false);
    setRetryAfter(0);
    setSuccess("");

    if (import.meta.env.PROD && !isAuthApiConfigured) {
      setError(getAuthApiConfigurationError());
      return;
    }

    try {
      const result = await login({
        email: email.trim().toLowerCase(),
        password,
      }).unwrap();

      const accessToken =
        result?.accessToken ||
        result?.token ||
        result?.data?.accessToken ||
        result?.data?.token;

      const user =
        result?.user ||
        result?.data?.user;
      const refreshToken =
        result?.refreshToken ||
        result?.data?.refreshToken;

      if (!accessToken) {
        throw new Error("No access token returned");
      }

      setAccessToken(accessToken);
      setRefreshToken(refreshToken);

      dispatch(
        setCredentials({
          accessToken,
          user,
        })
      );

      setSuccess("Sign in successful.");

      navigate(
        user?.role === "SUPER_ADMIN" ? "/super-admin/tenants" : "/dashboard",
        { replace: true }
      );
    } catch (error) {
      const retryAfterHeader =
        error?.meta?.response?.headers?.get?.("retry-after") ||
        error?.data?.retryAfter;
      const retrySeconds = Number(retryAfterHeader || 0);

      if (error?.status === 429) {
        setLocked(true);
        setRetryAfter(Math.max(retrySeconds, 0));
        return;
      }

      if (error?.status === 401) {
        const remainingAttempts = Number(error?.data?.remainingAttempts || 0);
        const message =
          error?.data?.message ||
          error?.data?.error ||
          "Wrong email or password.";

        setError(
          remainingAttempts > 0
            ? `${message} ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} left.`
            : message
        );
        return;
      }

      if (error?.status === "FETCH_ERROR") {
        setError(getAuthApiUnavailableError());
        return;
      }

      if (error?.status === "PARSING_ERROR") {
        setError("The server returned an invalid response. Please try again.");
        return;
      }

      setError(
        error?.data?.message ||
          error?.data?.error ||
          (typeof error?.data === "string" ? error.data : "") ||
          error?.message ||
          "Unable to sign in. Please try again."
      );
    }
  };

  return (
    <div className="login-page">
      <section className="login-brand-panel">
        <div className="brand-logo">
          <div className="brand-icon">↗</div>
          <span>PropFlow</span>
        </div>

        <div className="brand-content">
          <h1>
            Every listing, every site
            <br />
            visit, one pipeline.
          </h1>

          <p>
            List, assign and close properties with your whole brokerage
            working live on the same listing.
          </p>
        </div>

        <div className="brand-features">
          <span>Multi-tenant</span>
          <span>Live listing chat</span>
          <span>Excel export</span>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-container">
          <div className="login-heading">
            <h2>Sign in</h2>

            <p>
              New company?{" "}
              <Link to="/signup">
                Register your tenant
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Work email</label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            {locked && (
              <div className="lockout-alert">
                <div className="lockout-icon">!</div>

                <div>
                  <strong>Sign-in temporarily locked</strong>

                  <p>
                    Too many attempts. Try again in {retryLabel}.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="sign-in-button"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>

            {success && (
              <p className="login-success" role="status">
                {success}
              </p>
            )}
          </form>

          <p className="invite-text">
            Invited by your admin? Open the link from your invite.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Login;