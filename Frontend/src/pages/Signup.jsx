import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSignupMutation } from "../store/api/AuthApi";
import {
  getAuthApiConfigurationError,
  isAuthApiConfigured,
} from "../config/apiUrls";
import "../style/Login.css";

function Signup() {
  const navigate = useNavigate();
  const [signup, { isLoading }] = useSignupMutation();

  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (import.meta.env.PROD && !isAuthApiConfigured) {
      setError(getAuthApiConfigurationError());
      return;
    }

    try {
      await signup({
        companyName,
        name,
        email,
        password,
      }).unwrap();

      setSuccess("Account created successfully.");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      if (error?.status === "FETCH_ERROR") {
        setError(
          "Unable to reach the authentication service. Check its deployment and CORS settings."
        );
        return;
      }

      if (error?.status === "PARSING_ERROR") {
        setError("The authentication service returned an invalid response.");
        return;
      }

      if (error?.status === 404) {
        setError(
          "The authentication signup endpoint was not found. VITE_AUTH_API_URL must point to the deployed auth service, not the CRM API."
        );
        return;
      }

      setError(
        error?.data?.message ||
          error?.data?.error ||
          (error?.status >= 500
            ? "The authentication service is unavailable. Please try again later."
            : "") ||
          "Unable to create account. Please try again."
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
            <h2>Create your account</h2>
            <p>Create your PropFlow workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="signup-company">Company name</label>

              <input
                id="signup-company"
                type="text"
                autoComplete="organization"
                value={companyName}
                onChange={(event) => {
                  setCompanyName(event.target.value);
                  setError("");
                }}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-name">Your name</label>

              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-email">Work email</label>

              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-password">Password</label>

              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                required
              />
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="login-success" role="status">
                {success}
              </p>
            )}

            <button
              type="submit"
              className="sign-in-button"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="invite-text">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default Signup;