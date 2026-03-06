/**
 * Crea un usuario superadmin en Supabase Auth y en la tabla usuarios.
 *
 * Uso: node --env-file=.env scripts/create-admin-user.mjs
 * O:   node scripts/create-admin-user.mjs
 *
 * Requiere en .env:
 *   PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
if (existsSync(resolve(root, ".env.local"))) config({ path: resolve(root, ".env.local") });
if (existsSync(resolve(root, ".env"))) config({ path: resolve(root, ".env") });

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EMAIL = "rodrigo.caceres@asli.cl";
const PASSWORD = "Asli2026";
const NOMBRE = "Rodrigo Caceres";
const ROL = "superadmin";

async function main() {
  if (!url || !key) {
    console.error("Error: PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar en .env o .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: user, error: createError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { nombre: NOMBRE, rol: ROL },
  });

  if (createError) {
    if (createError.message.includes("already") || createError.message.includes("registered")) {
      console.log("El usuario ya existe. Vinculando con tabla usuarios...");
      const { data: existing } = await supabase.auth.admin.listUsers();
      const authUser = existing?.users?.find((u) => u.email === EMAIL);
      if (authUser) {
        await linkUsuario(supabase, authUser.id);
      }
    } else {
      console.error("Error al crear usuario:", createError.message);
      process.exit(1);
    }
  } else {
    console.log("Usuario creado en Auth:", user.user?.id);
    await linkUsuario(supabase, user.user.id);
  }

  console.log("Listo. Puedes iniciar sesión con", EMAIL);
}

async function linkUsuario(supabase, authId) {
  const { error } = await supabase.from("usuarios").upsert(
    { auth_id: authId, email: EMAIL, nombre: NOMBRE, rol: ROL, activo: true },
    { onConflict: "email" }
  );
  if (error) {
    const { error: updateError } = await supabase
      .from("usuarios")
      .update({ auth_id: authId })
      .eq("email", EMAIL);
    if (updateError) {
      console.warn("No se pudo vincular con usuarios:", updateError.message);
    } else {
      console.log("Usuario vinculado en tabla usuarios.");
    }
  } else {
    console.log("Usuario creado/actualizado en tabla usuarios.");
  }
}

main();
