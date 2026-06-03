import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

function AdminAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeExternalSignIn } = useAdminAuth();
  const [status, setStatus] = useState("Completing sign-in...");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const authError = searchParams.get("error");

    if (authError) {
      setError(authError.replace(/_/g, " "));
      setStatus("");
      return;
    }

    if (!token) {
      setError("Missing sign-in token.");
      setStatus("");
      return;
    }

    completeExternalSignIn(token)
      .then(() => {
        navigate("/admin/orders", { replace: true });
      })
      .catch((callbackError) => {
        setError(callbackError.message || "Unable to complete sign-in.");
        setStatus("");
      });
  }, [completeExternalSignIn, navigate, searchParams]);

  return (
    <main className="page-stack">
      <section className="section-panel admin-login-panel">
        <div className="section-heading">
          <p className="eyebrow">Google sign-in</p>
          <h2>{status || "Sign-in could not be completed."}</h2>
          {error ? <p className="field-error">{error}</p> : null}
          <div className="action-row">
            <Link className="secondary-button" to="/admin/login">
              Back to login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AdminAuthCallbackPage;
