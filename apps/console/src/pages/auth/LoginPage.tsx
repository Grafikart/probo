import { useTranslate } from "@probo/i18n";
import { Button, Field, useToast } from "@probo/ui";
import type { FormEventHandler } from "react";
import { Link } from "react-router";
import { buildEndpoint } from "/providers/RelayProviders";

export default function LoginPage() {
  const { __ } = useTranslate();
  const { toast } = useToast();

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();

    fetch(buildEndpoint("/api/console/v1/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || __("Failed to login"));
        }
        window.location.href = "/";
      })
      .catch((e) => {
        toast({
          title: __("Error"),
          description: e.message as string,
          variant: "error",
        });
      });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <h1 className="text-center text-2xl font-bold">
        {__("Login to your account")}
      </h1>
      <p className="text-center text-txt-tertiary mt-1 mb-6">
        {__("Enter your email below to login to your account")}
      </p>
      <Field
        required
        placeholder={__("Email")}
        name="email"
        type="email"
        label={__("Email")}
      />
      <Field
        required
        placeholder={__("Password")}
        name="password"
        type="password"
        label={__("Password")}
      />
      <Button className="w-full">{__("Login")}</Button>

      <div className="text-center mt-6 text-sm text-txt-secondary">
        {__("Don't have an account ?")}{" "}
        <Link to="/auth/register" className="underline hover:text-txt-primary">
          {__("Register")}
        </Link>
      </div>
      <div className="text-center mt-6 text-sm text-txt-secondary">
        {__("Forgot password?")}{" "}
        <Link
          to="/auth/forgot-password"
          className="underline hover:text-txt-primary"
        >
          {__("Reset password")}
        </Link>
      </div>
    </form>
  );
}
