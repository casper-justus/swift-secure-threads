
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmailAuthFormProps {
  email: string;
  password: string;
  isSignUp: boolean;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
}

export const EmailAuthForm = ({
  email,
  password,
  isSignUp,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
}: EmailAuthFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        required
        className="bg-[#40444b] border-[#40444b] text-white placeholder:text-[#72767d]"
      />
      <div>
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          className="bg-[#40444b] border-[#40444b] text-white placeholder:text-[#72767d]"
        />
        {isSignUp && (
          <div className="mt-2 text-xs text-[#72767d] space-y-1 p-2 rounded-md bg-[#40444b] border border-[#40444b]">
            <p className="font-medium text-[#b9bbbe]">Password requirements:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>At least 8 characters</li>
              <li>One uppercase letter (A-Z)</li>
              <li>One lowercase letter (a-z)</li>
              <li>One number (0-9)</li>
              <li>One special character (e.g., !@#$%)</li>
            </ul>
          </div>
        )}
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white"
      >
        {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onToggleMode}
        className="w-full text-[#00a8fc] hover:text-white hover:bg-[#40444b]"
      >
        {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
      </Button>
    </form>
  );
};
