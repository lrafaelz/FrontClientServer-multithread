import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export const useLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [hostError, setHostError] = useState("");
  const [portError, setPortError] = useState("");

  const { login, isLoading, connectionConfig } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize host and port from context on mount
  useEffect(() => {
    setHost(connectionConfig.host);
    setPort(connectionConfig.port);
  }, [connectionConfig]);

  // Get the path user was trying to access before login
  const from = location.state?.from?.pathname || "/";

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateHost = (host: string) => {
    if (!host.trim()) return false;

    // Validate IP address or hostname
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const hostnameRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    return (
      ipRegex.test(host) || hostnameRegex.test(host) || host === "localhost"
    );
  };

  const validatePort = (port: string) => {
    const portNum = parseInt(port);
    return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
  };

  const validateForm = () => {
    let isValid = true;

    // Reset errors
    setEmailError("");
    setPasswordError("");
    setHostError("");
    setPortError("");
    setError("");

    // Validate email
    if (!email.trim()) {
      setEmailError("Email é obrigatório");
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Digite um email válido");
      isValid = false;
    }

    // Validate password
    if (!password.trim()) {
      setPasswordError("Senha é obrigatória");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres");
      isValid = false;
    }

    // Validate host
    if (!host.trim()) {
      setHostError("Host é obrigatório");
      isValid = false;
    } else if (!validateHost(host)) {
      setHostError("Digite um host válido (IP ou hostname)");
      isValid = false;
    }

    // Validate port
    if (!port.trim()) {
      setPortError("Porta é obrigatória");
      isValid = false;
    } else if (!validatePort(port)) {
      setPortError("Digite uma porta válida (1-65535)");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const result = await login(email, password, host, port);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || "Erro ao fazer login");
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    host,
    setHost,
    port,
    setPort,
    showPassword,
    error,
    emailError,
    passwordError,
    hostError,
    portError,
    isLoading,
    handleSubmit,
    handleClickShowPassword,
  };
};
