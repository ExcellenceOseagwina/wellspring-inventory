const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.SUPABASE_ANON_KEY;
const supabaseKey = publicKey || serviceRoleKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL and Supabase key in backend/.env");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const hasServiceRoleKey = Boolean(serviceRoleKey && serviceRoleKey.trim() && !serviceRoleKey.startsWith("your-"));
const serviceSupabase = hasServiceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : supabase;

const keyRole = (key) => {
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    return payload.role;
  } catch (error) {
    return "";
  }
};

supabase.forRequest = (req) => {
  if (hasServiceRoleKey || keyRole(supabaseKey) === "service_role") return serviceSupabase;

  const authHeader = req.headers.authorization;
  if (!authHeader) return supabase;

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
};

supabase.admin = serviceSupabase;

module.exports = supabase;
