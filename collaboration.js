(() => {
  const config = window.SUPABASE_CONFIG;
  if (!config?.url || !config?.publishableKey || !window.supabase) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const moduleKeys = [
    "antecedentesDocentes",
    "antecedentesCientificos",
    "antecedentesExtension",
    "antecedentesProfesionales",
    "otrosAntecedentes"
  ];

  const authGate = document.querySelector("#auth-gate");
  const authForm = document.querySelector("#auth-form");
  const authStatus = document.querySelector("#auth-status");
  const toolbar = document.querySelector("#collaboration-toolbar");
  const competitionSelect = document.querySelector("#competition-select");
  const syncStatus = document.querySelector("#sync-status");
  const accessPanel = document.querySelector("#access-panel");

  let session = null;
  let memberships = [];
  let currentCompetition = null;
  let currentMember = null;
  let realtimeChannel = null;
  let saveTimer = null;
  let reloadTimer = null;
  let suppressSave = true;
  let saving = false;
  let loadedUserId = null;
  let sessionSequence = 0;

  function withTimeout(promise, milliseconds, message) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), milliseconds);
      })
    ]);
  }

  function setStatus(element, message, error = false) {
    element.textContent = message;
    element.classList.toggle("is-error", error);
  }

  function authErrorMessage(error) {
    const message = error?.message || "";
    const retryMatch = message.match(/after (\d+) seconds?/i);
    if (retryMatch) {
      return `Espere ${retryMatch[1]} segundos antes de volver a intentarlo. Revise si ya recibió el correo de confirmación.`;
    }
    if (/email rate limit exceeded/i.test(message)) {
      return "Se solicitaron demasiados correos. Espere un minuto y revise su bandeja de entrada o spam.";
    }
    if (/user already registered/i.test(message)) {
      return "Esta cuenta ya existe. Confirme el email recibido y luego pulse Ingresar.";
    }
    if (/invalid login credentials/i.test(message)) {
      return "Email o contraseña incorrectos, o la cuenta todavía no fue confirmada.";
    }
    if (/email not confirmed/i.test(message)) {
      return "La cuenta todavía no fue confirmada. Abra el enlace enviado a su email.";
    }
    return message || "No se pudo completar el acceso.";
  }

  function setSyncStatus(message, className = "") {
    syncStatus.textContent = message;
    syncStatus.className = `sync-status${className ? ` ${className}` : ""}`;
  }

  function sharedStateSnapshot() {
    const shared = clone(state);
    shared.oposicion.evaluadores.forEach((evaluador) => {
      evaluador.evaluaciones = {};
    });
    moduleKeys.forEach((key) => {
      shared[key].cargasEvaluadores = {};
    });
    return shared;
  }

  function evaluatorStateSnapshot(evaluatorKey) {
    const evaluador = state.oposicion.evaluadores.find((item) => item.id === evaluatorKey);
    return {
      evaluatorKey,
      oppositionEvaluations: clone(evaluador?.evaluaciones || {}),
      modules: Object.fromEntries(moduleKeys.map((key) => [
        key,
        clone(state[key].cargasEvaluadores[evaluatorKey] || {})
      ]))
    };
  }

  function mergeEvaluatorState(remoteState) {
    const evaluatorKey = remoteState?.data?.evaluatorKey;
    if (!evaluatorKey) return;
    const evaluador = state.oposicion.evaluadores.find((item) => item.id === evaluatorKey);
    if (evaluador) {
      evaluador.evaluaciones = clone(remoteState.data.oppositionEvaluations || {});
    }
    moduleKeys.forEach((key) => {
      state[key].cargasEvaluadores[evaluatorKey] = clone(remoteState.data.modules?.[key] || {});
    });
  }

  function normalizeEvaluatorNames(member) {
    const evaluadores = state?.oposicion?.evaluadores || [];
    evaluadores.forEach((evaluador, index) => {
      evaluador.nombre = String(evaluador.nombre || "").trim() || `Evaluador ${index + 1}`;
    });
    if (!member?.evaluator_key) return;
    const assigned = evaluadores.find((evaluador) => evaluador.id === member.evaluator_key);
    const memberName = String(member.display_name || "").trim();
    if (assigned && memberName && /^Evaluador \d+$/i.test(assigned.nombre)) {
      assigned.nombre = memberName;
    }
  }

  async function claimInvitations() {
    const { error } = await withTimeout(
      client.rpc("claim_competition_invitations"),
      10000,
      "La autorización demoró demasiado. Recargue la página."
    );
    if (error) throw error;
  }

  async function loadCompetitions(preferredId = null) {
    competitionSelect.innerHTML = `<option value="">Cargando concursos...</option>`;
    const { data: memberRows, error: memberError } = await withTimeout(
      client
        .from("competition_members")
        .select("*")
        .eq("active", true),
      10000,
      "No se pudieron cargar los concursos. Compruebe la conexión y recargue."
    );
    if (memberError) throw memberError;

    const memberCompetitionIds = memberRows.map((item) => item.competition_id);
    const { data: ownedRows, error: ownedError } = await withTimeout(
      client
        .from("competitions")
        .select("*")
        .eq("owner_id", session.user.id),
      10000,
      "No se pudieron cargar los concursos administrados."
    );
    if (ownedError) throw ownedError;

    let memberCompetitions = [];
    if (memberCompetitionIds.length) {
      const { data, error } = await withTimeout(
        client
          .from("competitions")
          .select("*")
          .in("id", memberCompetitionIds),
        10000,
        "No se pudieron cargar los concursos compartidos."
      );
      if (error) throw error;
      memberCompetitions = data;
    }

    const competitionMap = new Map(
      [...ownedRows, ...memberCompetitions].map((competition) => [competition.id, competition])
    );
    memberships = [...competitionMap.values()].map((competition) => ({
      competition,
      member: memberRows.find((item) => item.competition_id === competition.id)
        || {
          competition_id: competition.id,
          user_id: session.user.id,
          role: "admin",
          evaluator_key: state.oposicion.evaluadores[0]?.id || null,
          display_name: session.user.user_metadata?.display_name || session.user.email
        }
    }));

    competitionSelect.innerHTML = memberships.length
      ? memberships.map(({ competition }) => `
          <option value="${competition.id}">${escapeAttribute(competition.name)}</option>
        `).join("")
      : `<option value="">Sin concursos compartidos</option>`;

    const targetId = preferredId
      || currentCompetition?.id
      || memberships[0]?.competition.id
      || "";
    competitionSelect.value = targetId;
    if (targetId) await loadCompetition(targetId);
    else {
      currentCompetition = null;
      currentMember = null;
      accessPanel.hidden = true;
      setSyncStatus("Cree un concurso o acepte una invitación");
      updateSessionUi();
      applyPermissions();
    }
  }

  async function loadCompetition(competitionId) {
    const membership = memberships.find((item) => item.competition.id === competitionId);
    if (!membership) return;

    setSyncStatus("Cargando datos compartidos…", "is-saving");
    const { data: competition, error: competitionError } = await withTimeout(
      client
        .from("competitions")
        .select("*")
        .eq("id", competitionId)
        .single(),
      10000,
      "El concurso demoró demasiado en cargar."
    );
    if (competitionError) throw competitionError;

    const { data: remoteStates, error: statesError } = await withTimeout(
      client
        .from("evaluator_states")
        .select("*")
        .eq("competition_id", competitionId),
      10000,
      "Las cargas de los evaluadores demoraron demasiado."
    );
    if (statesError) throw statesError;

    currentCompetition = competition;
    currentMember = membership.member;
    suppressSave = true;
    state = seedEvaluations(migrateState(clone(competition.shared_state)));
    normalizeEvaluatorNames(currentMember);
    remoteStates.forEach(mergeEvaluatorState);
    activeEvaluatorId = currentMember.evaluator_key || state.oposicion.evaluadores[0]?.id || null;
    activeDocentesCargaId = currentMember.evaluator_key || "consolidada";
    activeCientificosCargaId = currentMember.evaluator_key || "consolidada";
    activeExtensionCargaId = currentMember.evaluator_key || "consolidada";
    activeProfesionalesCargaId = currentMember.evaluator_key || "consolidada";
    activeOtrosCargaId = currentMember.evaluator_key || "consolidada";
    render();
    suppressSave = false;
    updateSessionUi();
    subscribeRealtime(competitionId);
    await renderAccessList();
    setSyncStatus("Datos sincronizados", "is-saved");
  }

  async function saveRemoteState() {
    if (suppressSave || saving || !currentCompetition || !currentMember) return;
    saving = true;
    setSyncStatus("Guardando…", "is-saving");
    try {
      if (currentMember.role === "admin") {
        const { error } = await client
          .from("competitions")
          .update({
            name: currentCompetition.name,
            administrative_details: state.administrativeDetails || "",
            starts_on: state.contestStartDate || null,
            ends_on: state.contestEndDate || null,
            shared_state: sharedStateSnapshot()
          })
          .eq("id", currentCompetition.id);
        if (error) throw error;
      }

      if (currentMember.evaluator_key) {
        const { error } = await client
          .from("evaluator_states")
          .upsert({
            competition_id: currentCompetition.id,
            user_id: session.user.id,
            data: evaluatorStateSnapshot(currentMember.evaluator_key)
          });
        if (error) throw error;
      }
      setSyncStatus(`Guardado ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`, "is-saved");
    } catch (error) {
      setSyncStatus(error.message || "No se pudo guardar", "is-error");
    } finally {
      saving = false;
    }
  }

  function scheduleSave() {
    if (suppressSave || !currentCompetition) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveRemoteState, 700);
  }

  function subscribeRealtime(competitionId) {
    if (realtimeChannel) client.removeChannel(realtimeChannel);
    realtimeChannel = client
      .channel(`competition-${competitionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "competitions", filter: `id=eq.${competitionId}` },
        scheduleReload
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evaluator_states", filter: `competition_id=eq.${competitionId}` },
        scheduleReload
      )
      .subscribe();
  }

  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      if (!saving && currentCompetition) loadCompetition(currentCompetition.id);
    }, 500);
  }

  function updateSessionUi() {
    const displayName = currentMember?.display_name
      || session?.user?.user_metadata?.display_name
      || session?.user?.email
      || "";
    document.querySelector("#collaboration-user").textContent = displayName;
    document.querySelector("#collaboration-role").textContent = currentMember
      ? `${currentMember.role === "admin" ? "Administrador" : "Evaluador"} · ${session.user.email}`
      : session?.user?.email || "";
    document.querySelector("#manage-access").hidden = currentMember?.role !== "admin";
    document.querySelector("#manage-access").disabled = !currentCompetition;
    document.querySelector("#create-competition").disabled = !session;
    fillEvaluatorOptions();
  }

  function fillEvaluatorOptions() {
    const select = document.querySelector("#invite-evaluator");
    const evaluadores = state?.oposicion?.evaluadores || [];
    select.innerHTML = evaluadores.length
      ? evaluadores.map((evaluador) => `
          <option value="${evaluador.id}">${escapeAttribute(evaluador.nombre)}</option>
        `).join("")
      : `<option value="">No hay evaluadores configurados</option>`;
  }

  async function createCompetition() {
    const name = document.querySelector("#competition-name").value.trim() || "Concurso JTP";
    setSyncStatus("Creando concurso…", "is-saving");
    const evaluatorKey = state.oposicion.evaluadores[0]?.id || null;
    const displayName = session.user.user_metadata?.display_name || session.user.email;
    if (!evaluatorKey) throw new Error("Configure al menos un evaluador antes de crear el concurso.");
    state.oposicion.evaluadores.find((item) => item.id === evaluatorKey).nombre = displayName;

    const { data: competitionId, error } = await client.rpc("create_competition", {
      initial_name: name,
      initial_administrative_details: state.administrativeDetails || "",
      initial_starts_on: state.contestStartDate || null,
      initial_ends_on: state.contestEndDate || null,
      initial_shared_state: sharedStateSnapshot(),
      initial_evaluator_key: evaluatorKey,
      initial_display_name: displayName,
      initial_color: evaluatorColor(evaluatorKey)
    });
    if (error) throw error;
    await loadCompetitions(competitionId);
  }

  async function inviteEvaluator() {
    if (!currentCompetition || currentMember?.role !== "admin") return;
    const email = document.querySelector("#invite-email").value.trim().toLowerCase();
    const displayName = document.querySelector("#invite-name").value.trim();
    const evaluatorKey = document.querySelector("#invite-evaluator").value;
    const evaluador = state.oposicion.evaluadores.find((item) => item.id === evaluatorKey);
    if (!email || !displayName || !evaluatorKey) {
      setStatus(document.querySelector("#access-status"), "Complete email, nombre e identidad.", true);
      return;
    }
    const { data: occupiedMember, error: occupiedError } = await client
      .from("competition_members")
      .select("display_name")
      .eq("competition_id", currentCompetition.id)
      .eq("evaluator_key", evaluatorKey)
      .maybeSingle();
    if (occupiedError) throw occupiedError;
    if (occupiedMember) {
      setStatus(
        document.querySelector("#access-status"),
        `Ese lugar ya está asignado a ${occupiedMember.display_name}.`,
        true
      );
      return;
    }
    evaluador.nombre = displayName;
    const { error } = await client.from("competition_invitations").upsert({
      competition_id: currentCompetition.id,
      email,
      role: "evaluator",
      evaluator_key: evaluatorKey,
      display_name: displayName,
      color: evaluador?.color || "#2d6f8f",
      accepted_at: null
    }, { onConflict: "competition_id,email" });
    if (error) throw error;
    scheduleSave();

    setStatus(
      document.querySelector("#access-status"),
      `Acceso autorizado para ${email}. Esa persona debe ingresar o crear su cuenta usando exactamente ese email.`
    );
    await renderAccessList();
  }

  async function renderAccessList() {
    const list = document.querySelector("#access-list");
    if (!currentCompetition || currentMember?.role !== "admin") {
      list.innerHTML = "";
      return;
    }
    const [{ data: members }, { data: invitations }] = await Promise.all([
      client.from("competition_members").select("*").eq("competition_id", currentCompetition.id),
      client.from("competition_invitations").select("*").eq("competition_id", currentCompetition.id)
    ]);
    const memberRows = (members || []).map((member) => `
      <div class="access-row">
        <span>${escapeAttribute(member.display_name || member.user_id)}</span>
        <span>${escapeAttribute(
          state.oposicion.evaluadores.find((item) => item.id === member.evaluator_key)?.nombre
            || member.role
        )}</span>
        <strong>Activo</strong>
      </div>
    `);
    const invitationRows = (invitations || []).map((invitation) => `
      <div class="access-row">
        <span>${escapeAttribute(invitation.email)}</span>
        <span>${escapeAttribute(
          state.oposicion.evaluadores.find((item) => item.id === invitation.evaluator_key)?.nombre
            || invitation.display_name
        )}</span>
        <strong>${invitation.accepted_at ? "Aceptada" : "Pendiente"}</strong>
      </div>
    `);
    list.innerHTML = [...memberRows, ...invitationRows].join("");
  }

  function setDisabled(selector, disabled) {
    document.querySelectorAll(selector).forEach((element) => {
      element.disabled = disabled;
    });
  }

  function applyPermissions() {
    if (!session || !currentCompetition || !currentMember) return;
    const isAdmin = currentMember.role === "admin";
    const evaluatorKey = currentMember.evaluator_key;

    const adminSelectors = [
      "#config input",
      "#postulantes input",
      "#postulantes button",
      "#header-evaluators-list input",
      "#header-evaluators-list button",
      "#add-evaluador",
      "#criteria-panel input",
      "#criteria-panel button",
      "#docentes-config-panel input",
      "#docentes-config-panel button",
      "#cientificos-config-panel input",
      "#cientificos-config-panel button",
      "#extension-config-panel input",
      "#extension-config-panel button",
      "#profesionales-config-panel input",
      "#profesionales-config-panel button",
      "#otros-config-panel input",
      "#otros-config-panel button"
    ];
    adminSelectors.forEach((selector) => setDisabled(selector, !isAdmin));

    setDisabled("#evaluadores-list input, #evaluadores-list textarea", activeEvaluatorId !== evaluatorKey);
    setDisabled("#docentes-matrix input", activeDocentesCargaId !== evaluatorKey && !isAdmin);
    setDisabled("#cientificos-matrix input", activeCientificosCargaId !== evaluatorKey && !isAdmin);
    setDisabled("#extension-matrix input", activeExtensionCargaId !== evaluatorKey && !isAdmin);
    setDisabled("#profesionales-matrix input", activeProfesionalesCargaId !== evaluatorKey && !isAdmin);
    setDisabled("#otros-matrix input", activeOtrosCargaId !== evaluatorKey && !isAdmin);

    setDisabled(
      "#docentes-evaluation-controls input, #cientificos-evaluation-controls input, "
        + "#extension-evaluation-controls input, #profesionales-evaluation-controls input, "
        + "#otros-evaluation-controls input",
      !isAdmin
    );
  }

  async function handleSession(nextSession) {
    const sequence = ++sessionSequence;
    session = nextSession;
    if (!session) {
      loadedUserId = null;
      memberships = [];
      currentCompetition = null;
      currentMember = null;
      suppressSave = true;
      authGate.hidden = false;
      toolbar.hidden = true;
      accessPanel.hidden = true;
      competitionSelect.innerHTML = `<option value="">Sin sesión</option>`;
      document.body.classList.add("auth-locked");
      return;
    }
    if (loadedUserId === session.user.id && currentCompetition) return;
    authGate.hidden = true;
    toolbar.hidden = false;
    document.body.classList.remove("auth-locked");
    setStatus(authStatus, "");
    updateSessionUi();
    try {
      await claimInvitations();
      if (sequence !== sessionSequence) return;
      await loadCompetitions();
      if (sequence !== sessionSequence) return;
      loadedUserId = session.user.id;
      updateSessionUi();
      suppressSave = false;
    } catch (error) {
      competitionSelect.innerHTML = `<option value="">No se pudo cargar</option>`;
      setSyncStatus(error.message || "No se pudo iniciar la colaboración", "is-error");
      document.querySelector("#create-competition").disabled = false;
    }
  }

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(authStatus, "Ingresando…");
    const { error } = await client.auth.signInWithPassword({
      email: document.querySelector("#auth-email").value.trim(),
      password: document.querySelector("#auth-password").value
    });
    if (error) setStatus(authStatus, authErrorMessage(error), true);
  });

  document.querySelector("#auth-sign-up").addEventListener("click", async () => {
    const email = document.querySelector("#auth-email").value.trim();
    const password = document.querySelector("#auth-password").value;
    const displayName = document.querySelector("#auth-display-name").value.trim();
    if (!email || !password || !displayName) {
      setStatus(authStatus, "Para crear la cuenta complete nombre, email y contraseña.", true);
      return;
    }
    setStatus(authStatus, "Creando cuenta…");
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin
      }
    });
    if (error) {
      setStatus(authStatus, authErrorMessage(error), true);
      return;
    }
    setStatus(
      authStatus,
      data.session
        ? "Cuenta creada."
        : "Cuenta creada. Revise su email para confirmarla antes de ingresar."
    );
  });

  document.querySelector("#auth-sign-out").addEventListener("click", async () => {
    await handleSession(null);
    try {
      await withTimeout(client.auth.signOut({ scope: "local" }), 5000, "La sesión local ya fue cerrada.");
    } catch (_error) {
      localStorage.removeItem(`sb-${new URL(config.url).hostname.split(".")[0]}-auth-token`);
    }
  });
  document.querySelector("#create-competition").addEventListener("click", async () => {
    const button = document.querySelector("#create-competition");
    button.disabled = true;
    try {
      await createCompetition();
    } catch (error) {
      setSyncStatus(error.message || "No se pudo crear el concurso", "is-error");
    } finally {
      button.disabled = false;
    }
  });
  competitionSelect.addEventListener("change", () => loadCompetition(competitionSelect.value));
  document.querySelector("#manage-access").addEventListener("click", () => {
    if (!currentCompetition || currentMember?.role !== "admin") {
      setSyncStatus("Primero cree o seleccione un concurso compartido.", "is-error");
      return;
    }
    accessPanel.hidden = !accessPanel.hidden;
    if (!accessPanel.hidden) renderAccessList();
  });
  document.querySelector("#copy-access-link").addEventListener("click", async () => {
    const status = document.querySelector("#access-status");
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setStatus(status, "Enlace de ingreso copiado.");
    } catch (_error) {
      setStatus(status, `Comparta este enlace: ${window.location.origin}`);
    }
  });
  document.querySelector("#close-access-panel").addEventListener("click", () => {
    accessPanel.hidden = true;
  });
  document.querySelector("#send-invitation").addEventListener("click", async () => {
    try {
      await inviteEvaluator();
    } catch (error) {
      setStatus(document.querySelector("#access-status"), error.message, true);
    }
  });

  window.collaboration = {
    scheduleSave,
    applyPermissions,
    client
  };

  document.body.classList.add("auth-locked");
  fillEvaluatorOptions();
  client.auth.getSession().then(({ data }) => {
    setTimeout(() => handleSession(data.session), 0);
  });
  client.auth.onAuthStateChange((event, nextSession) => {
    if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
    setTimeout(() => handleSession(nextSession), 0);
  });
})();
