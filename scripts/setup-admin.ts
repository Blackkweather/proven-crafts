// scripts/setup-admin.ts
// Run with: npx tsx scripts/setup-admin.ts
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const SUPABASE_URL = "https://jzcwlsduslwxmgbbhxgh.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log("Setting up admin role...");
  
  // Get all users
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, display_name, account_type");

  if (usersError) {
    console.error("Error fetching users:", usersError);
    return;
  }

  console.log(`Found ${users.length} users:`);
  users.forEach(u => console.log(`  - ${u.display_name} (${u.id})`));

  if (users.length === 0) {
    console.log("\nNo users found. Please sign up at http://localhost:8080/auth/signup first.");
    return;
  }

  // Assign admin to first user
  const firstUserId = users[0].id;
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: firstUserId, role: "admin" })
    .select();

  if (roleError && !roleError.message.includes("duplicate")) {
    console.error("Error assigning admin role:", roleError);
    return;
  }

  console.log(`\n✅ Admin role assigned to: ${users[0].display_name}`);
  console.log("You can now login at http://localhost:8080/auth/signin and access http://localhost:8080/admin");
}

main().catch(console.error);