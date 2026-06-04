const supabase = require("../config/supabase");

const authError = (res, error) => {
  return res.status(400).json({ error: error.message || "Authentication failed" });
};

const signup = async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: "Full name, email, and password are required" });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } }
  });

  if (error) return authError(res, error);
  res.status(201).json({ user: data.user, session: data.session });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return authError(res, error);

  res.json({ user: data.user, session: data.session });
};

const forgotPassword = async (req, res) => {
  const { email, redirectTo } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });
  if (error) return authError(res, error);

  res.json({ message: "Password reset link sent" });
};

const resetPassword = async (req, res) => {
  const { access_token, refresh_token, password } = req.body;
  if (!access_token || !refresh_token || !password) {
    return res.status(400).json({ error: "Reset token and new password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const resetSupabase = supabase.withAuthHeader(`Bearer ${access_token}`);
  const { data: sessionData, error: sessionError } = await resetSupabase.auth.setSession({
    access_token,
    refresh_token
  });
  if (sessionError || !sessionData.session) {
    return res.status(400).json({ error: "Invalid or expired password reset link" });
  }

  const { error } = await resetSupabase.auth.updateUser({
    password
  });
  if (error) return authError(res, error);

  res.json({ message: "Password updated successfully. Please sign in." });
};

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword
};
