const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(body)
});

const readJson = async (response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.msg || body.error_description || body.error || "Error de Supabase.");
  return body;
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Método no permitido." });

  const supabaseUrl = process.env.SUPABASE_URL || "https://fbcjmrvyerzmkqjanvhp.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = (process.env.SITE_URL || "https://asistentedeconcursosege.netlify.app").replace(/\/$/, "");
  if (!serviceRoleKey) return json(503, { error: "Falta configurar la clave segura de Supabase en Netlify." });

  const authorization = event.headers.authorization || "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) return json(401, { error: "Sesión inválida." });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_error) {
    return json(400, { error: "Solicitud inválida." });
  }

  const competitionId = String(payload.competitionId || "");
  const email = String(payload.email || "").trim().toLowerCase();
  if (!competitionId || !email) return json(400, { error: "Faltan el concurso o el email." });

  const serviceHeaders = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json"
  };

  try {
    const userData = await readJson(await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceRoleKey, authorization: `Bearer ${accessToken}` }
    }));

    const competitionUrl = new URL(`${supabaseUrl}/rest/v1/competitions`);
    competitionUrl.searchParams.set("select", "owner_id");
    competitionUrl.searchParams.set("id", `eq.${competitionId}`);
    competitionUrl.searchParams.set("limit", "1");
    const membershipUrl = new URL(`${supabaseUrl}/rest/v1/competition_members`);
    membershipUrl.searchParams.set("select", "role,active");
    membershipUrl.searchParams.set("competition_id", `eq.${competitionId}`);
    membershipUrl.searchParams.set("user_id", `eq.${userData.id}`);
    membershipUrl.searchParams.set("limit", "1");

    const [competitions, memberships] = await Promise.all([
      readJson(await fetch(competitionUrl, { headers: serviceHeaders })),
      readJson(await fetch(membershipUrl, { headers: serviceHeaders }))
    ]);
    const isAdmin = competitions[0]?.owner_id === userData.id
      || (memberships[0]?.active && memberships[0]?.role === "admin");
    if (!isAdmin) return json(403, { error: "Solo un administrador puede generar enlaces de acceso." });

    const invitationUrl = new URL(`${supabaseUrl}/rest/v1/competition_invitations`);
    invitationUrl.searchParams.set("select", "email,display_name");
    invitationUrl.searchParams.set("competition_id", `eq.${competitionId}`);
    invitationUrl.searchParams.set("email", `ilike.${email}`);
    invitationUrl.searchParams.set("accepted_at", "is.null");
    invitationUrl.searchParams.set("limit", "1");
    const invitations = await readJson(await fetch(invitationUrl, { headers: serviceHeaders }));
    if (!invitations[0]) return json(404, { error: "Primero autorice ese email en un lugar libre de la terna." });

    const usersData = await readJson(await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: serviceHeaders
    }));
    const existingUser = usersData.users?.find((user) => user.email?.toLowerCase() === email);
    const redirectTo = `${siteUrl}/?invite=1`;
    const linkPayload = existingUser
      ? { type: "magiclink", email, redirect_to: redirectTo }
      : {
          type: "signup",
          email,
          password: `${crypto.randomUUID()}Aa1!`,
          data: { display_name: invitations[0].display_name },
          redirect_to: redirectTo
        };
    const linkData = await readJson(await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify(linkPayload)
    }));
    const actionLink = linkData.action_link || linkData.properties?.action_link;
    if (!actionLink) return json(500, { error: "Supabase no devolvió el enlace de acceso." });
    return json(200, { link: actionLink });
  } catch (error) {
    return json(500, { error: error.message || "No se pudo generar el enlace seguro." });
  }
};
