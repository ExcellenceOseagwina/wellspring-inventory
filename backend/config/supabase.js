const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = serviceRoleKey || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL and Supabase key in backend/.env");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const keyRole = (() => {
  try {
    const payload = JSON.parse(Buffer.from(supabaseKey.split(".")[1], "base64url").toString("utf8"));
    return payload.role;
  } catch (error) {
    return "";
  }
})();
const hasServiceRoleKey = Boolean(serviceRoleKey && serviceRoleKey.trim() && !serviceRoleKey.startsWith("your-"));

supabase.forRequest = (req) => {
  if (hasServiceRoleKey || keyRole === "service_role") return supabase;

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

module.exports = supabase;
