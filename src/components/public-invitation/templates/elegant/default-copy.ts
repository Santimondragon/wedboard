// Default copy of the elegant template (from the Figma design).
// Seeds block configs in elegantDefaultLayout() and remains the render
// fallback for layouts saved before the copy became authorable.

export const ELEGANT_COPY = {
  heroIntro:
    "Con mucha alegría en el corazón, queremos invitarte a acompañarnos en uno de los momentos más importantes de nuestras vidas. Será un día para celebrar el amor, la unión y el comienzo de una nueva historia que soñamos compartir con quienes más queremos.",
  rsvpTitle: "Confirma tu asistencia",
  rsvpDeadline: "Antes del 00 del Mes",
  rsvpAttendLabel: "Si asistiré",
  rsvpDeclineLabel: "Lamentablemente no podré asistir",
  rsvpPlusOneSuffix: "(+1)",
  rsvpSubmitLabel: "Enviar",
  rsvpNote:
    "Aunque adoramos a los más pequeños, hemos decidido que esta celebración sea exclusivamente para adultos.",
  foodHeadline: "Comida",
  foodNote:
    "Por favor, indícanos si tienes alguna alergia o restricción alimentaria para tenerlo en cuenta:",
  foodOptions: [
    "Frutos secos",
    "Mariscos / pescados",
    "Lácteos",
    "Gluten",
    "Huevo",
    "Vegetariano / Vegano",
  ],
  foodQuestion: "¿Tienes alguna alergia o restricción alimentaria?",
  foodNoneLabel: "No, como de todo",
  foodHasLabel: "Sí, tengo algunas",
  foodOtherLabel: "Otra:",
  foodOtherPlaceholder: "Cuéntanos…",
  foodSubmitLabel: "Enviar",
  dressCode:
    "*Hombres*: Smoking (traje y corbatín)\n*Mujeres*: Vestido formal de un solo tono\n\nAgradecemos evitar el color vinotinto, el blanco y sus tonalidades afines, tanto en vestuario femenino como masculino.",
  dinnerDescription:
    "Porque los mejores momentos comienzan alrededor de una mesa, los esperamos para compartir una cena especial y comenzar juntos este fin de semana inolvidable.",
  dinnerName: "Una Noche para Compartir",
  dinnerConfirmLabel: "Confirmar asistencia",
  dinnerDetailsLabel: "Ver detalles",
  dinnerModalTitle: "Confirma tu asistencia",
  dinnerModalNote: "Indícanos quién podrá acompañarnos.",
  dinnerAttendLabel: "Sí, asistiré",
  dinnerDeclineLabel: "No podré asistir",
  dinnerModalSubmitLabel: "Enviar",
  stayHeadline: "Continúa la celebración",
  stayBody:
    "Después de una noche inolvidable, queremos que puedas descansar y disfrutar con tranquilidad. Si deseas hospedarte en la hacienda, por favor confírmanos tu asistencia.",
  footerNote:
    "Esperamos celebrar juntos este comienzo tan importante en nuestras vidas.",
  messageHeadline: "Déjanos un mensaje",
  messageNote:
    "Sentimos que no puedas acompañarnos. Si quieres, déjanos unas palabras: nos encantará leerte.",
  messageNameLabel: "Tu nombre",
  messageMessageLabel: "Tu mensaje",
  messagePlaceholder: "Escribe aquí…",
  messageSubmitLabel: "Enviar",
  itineraryItems: [
    { time: "00:00 pm", label: "Ceremonia" },
    { time: "00:00 pm", label: "Recepción" },
    { time: "00:00 pm", label: "Cocktail de bienvenida" },
    { time: "00:00 pm", label: "Fiesta" },
  ],
} as const

/**
 * Per-block default configs for the elegant template. Used both to seed the
 * preset layout and to pre-fill newly added blocks in the editor.
 */
export const ELEGANT_BLOCK_CONFIG: Record<string, Record<string, unknown>> = {
  hero: { body: ELEGANT_COPY.heroIntro },
  location: { title: "Ubicación", buttonLabel: "Ver mapa" },
  rsvp: {
    title: ELEGANT_COPY.rsvpTitle,
    deadline: ELEGANT_COPY.rsvpDeadline,
    attendLabel: ELEGANT_COPY.rsvpAttendLabel,
    declineLabel: ELEGANT_COPY.rsvpDeclineLabel,
    note: ELEGANT_COPY.rsvpNote,
    submitLabel: ELEGANT_COPY.rsvpSubmitLabel,
  },
  itinerary: { items: [...ELEGANT_COPY.itineraryItems] },
  text: { showFlourishes: true },
  allergies: {
    headline: ELEGANT_COPY.foodHeadline,
    note: ELEGANT_COPY.foodNote,
    options: [...ELEGANT_COPY.foodOptions],
  },
  dressCode: { dressCode: ELEGANT_COPY.dressCode },
  specialInvitation: {
    specialTemplateId: "elegant",
    confirmLabel: ELEGANT_COPY.dinnerConfirmLabel,
    detailsLabel: ELEGANT_COPY.dinnerDetailsLabel,
  },
  stayInvite: {
    headline: ELEGANT_COPY.stayHeadline,
    body: ELEGANT_COPY.stayBody,
  },
  guestMessage: {
    headline: ELEGANT_COPY.messageHeadline,
    note: ELEGANT_COPY.messageNote,
    nameLabel: ELEGANT_COPY.messageNameLabel,
    messageLabel: ELEGANT_COPY.messageMessageLabel,
    placeholder: ELEGANT_COPY.messagePlaceholder,
    submitLabel: ELEGANT_COPY.messageSubmitLabel,
  },
  footer: { body: ELEGANT_COPY.footerNote },
}
