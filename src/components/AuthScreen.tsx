import { ArrowRight, Gift as GiftIcon } from "lucide-react";
import type { FormEvent } from "react";

type AuthMode = "create" | "sign-in";

type AuthScreenProps = {
    authMode: AuthMode;
    authName: string;
    authEmail: string;
    authPassword: string;
    authError: string;
    onModeChange: (mode: AuthMode) => void;
    onNameChange: (value: string) => void;
    onEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onOpenGiver: () => void;
};

export function AuthScreen({
    authMode,
    authName,
    authEmail,
    authPassword,
    authError,
    onModeChange,
    onNameChange,
    onEmailChange,
    onPasswordChange,
    onSubmit,
    onOpenGiver,
}: AuthScreenProps) {
    return (
        <main className="app-shell">
            <header className="topbar" id="top">
                <a className="brand" href="#top">
                    <span className="brand-mark">
                        <GiftIcon size={18} />
                    </span>
                    kindlist
                </a>
                <button className="text-button" onClick={onOpenGiver} type="button">
                    I have a code <ArrowRight size={15} />
                </button>
            </header>
            <section className="auth-layout">
                <div className="auth-intro">
                    <span className="eyebrow">Your private gift list</span>
                    <h1>
                        Start with an account.
                        <br />
                        <em>Keep the surprise.</em>
                    </h1>
                    <p>
                        Your list belongs to you. Create an account so your wishes,
                        categories, and sharing code are ready whenever you return.
                    </p>
                </div>
                <form className="auth-card" onSubmit={onSubmit}>
                    <div className="auth-tabs">
                        <button
                            className={authMode === "create" ? "active" : ""}
                            onClick={() => onModeChange("create")}
                            type="button"
                        >
                            Create account
                        </button>
                        <button
                            className={authMode === "sign-in" ? "active" : ""}
                            onClick={() => onModeChange("sign-in")}
                            type="button"
                        >
                            Sign in
                        </button>
                    </div>
                    <h2>{authMode === "create" ? "Make your list yours" : "Welcome back"}</h2>
                    <p>
                        {authMode === "create"
                            ? "It only takes a moment to get started."
                            : "Sign in to continue to your gift list."}
                    </p>
                    {authMode === "create" ? (
                        <label>
                            Your name
                            <input
                                autoFocus
                                required
                                onChange={(event) => onNameChange(event.target.value)}
                                placeholder="e.g. Alex Morgan"
                                value={authName}
                            />
                        </label>
                    ) : null}
                    <label>
                        Email address
                        <input
                            required
                            onChange={(event) => onEmailChange(event.target.value)}
                            placeholder="you@example.com"
                            type="email"
                            value={authEmail}
                        />
                    </label>
                    <label>
                        Password
                        <input
                            minLength={8}
                            required
                            onChange={(event) => onPasswordChange(event.target.value)}
                            placeholder="At least 8 characters"
                            type="password"
                            value={authPassword}
                        />
                    </label>
                    {authError ? <p className="error-message">{authError}</p> : null}
                    <button className="primary-button" type="submit">
                        {authMode === "create" ? "Create my account" : "Sign in"}{" "}
                        <ArrowRight size={17} />
                    </button>
                    <small>
                        Your account and lists are stored securely on the application
                        server, so you can access them from any device.
                    </small>
                </form>
            </section>
            <footer>
                <span>kindlist</span>
                <span>Thoughtful giving, made simple.</span>
            </footer>
        </main>
    );
}