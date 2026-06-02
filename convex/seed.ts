import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const seedDemoEvent = internalMutation({
  args: { ownerTokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    const owner = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.ownerTokenIdentifier)
      )
      .unique();

    if (!owner) {
      throw new ConvexError("Owner user not found");
    }

    // Create event
    const eventId = await ctx.db.insert("events", {
      name: "Maria & Daniel Wedding",
      slug: "maria-daniel-wedding",
      ownerUserId: owner._id,
      date: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days from now
      venueName: "Jardín de los Sueños",
      venueAddress: "Calle de la Novia 42, Madrid",
      status: "active",
    });

    // Add owner as event member
    await ctx.db.insert("eventMembers", {
      eventId,
      userId: owner._id,
      role: "owner",
    });

    // Create menu options
    const menuCarne = await ctx.db.insert("menuOptions", {
      eventId,
      name: "Menú de carne",
      description: "Solomillo de ternera con salsa de trufa",
      isActive: true,
      sortOrder: 1,
    });
    const menuPescado = await ctx.db.insert("menuOptions", {
      eventId,
      name: "Menú de pescado",
      description: "Lubina al horno con verduras de temporada",
      isActive: true,
      sortOrder: 2,
    });
    const menuVeg = await ctx.db.insert("menuOptions", {
      eventId,
      name: "Menú vegetariano",
      description: "Risotto de setas y espárragos",
      isActive: true,
      sortOrder: 3,
    });

    // Create drink options
    const drinkSinAlcohol = await ctx.db.insert("drinkOptions", {
      eventId,
      name: "Paquete bebidas sin alcohol",
      description: "Refrescos, agua y zumos naturales",
      isActive: true,
      sortOrder: 1,
    });
    const drinkVinos = await ctx.db.insert("drinkOptions", {
      eventId,
      name: "Paquete vinos y cava",
      description: "Vinos seleccionados y cava para el brindis",
      isActive: true,
      sortOrder: 2,
    });
    const drinkOpenBar = await ctx.db.insert("drinkOptions", {
      eventId,
      name: "Open bar premium",
      description: "Barra libre con cócteles y bebidas premium",
      isActive: true,
      sortOrder: 3,
    });

    // Create tables
    const table1 = await ctx.db.insert("tables", {
      eventId,
      name: "Mesa 1",
      seatsCount: 10,
      sortOrder: 1,
    });
    const table2 = await ctx.db.insert("tables", {
      eventId,
      name: "Mesa 2",
      seatsCount: 8,
      sortOrder: 2,
    });
    const table3 = await ctx.db.insert("tables", {
      eventId,
      name: "Mesa 3",
      seatsCount: 8,
      sortOrder: 3,
    });
    const table4 = await ctx.db.insert("tables", {
      eventId,
      name: "Mesa 4",
      seatsCount: 6,
      sortOrder: 4,
    });
    const table5 = await ctx.db.insert("tables", {
      eventId,
      name: "Mesa 5",
      seatsCount: 6,
      sortOrder: 5,
    });
    await ctx.db.insert("tables", {
      eventId,
      name: "Mesa 6",
      seatsCount: 6,
      sortOrder: 6,
    });

    // Create special events
    const cenaEnsayo = await ctx.db.insert("specialEvents", {
      eventId,
      name: "Cena de ensayo",
      description: "Cena íntima el día antes de la boda",
      date: Date.now() + 89 * 24 * 60 * 60 * 1000,
      location: "Restaurante El Jardín, Madrid",
      isActive: true,
    });
    const brunch = await ctx.db.insert("specialEvents", {
      eventId,
      name: "Brunch post-boda",
      description: "Brunch relajado al día siguiente de la celebración",
      date: Date.now() + 91 * 24 * 60 * 60 * 1000,
      location: "Hotel Principal, Madrid",
      isActive: true,
    });

    // Create invitations
    const inv1 = await ctx.db.insert("invitations", {
      eventId,
      title: "Familia García",
      slug: "familia-garcia",
      type: "group",
      maxGuests: 4,
      allowPlusOne: false,
      isActive: true,
    });

    const inv2 = await ctx.db.insert("invitations", {
      eventId,
      title: "Familia López",
      slug: "familia-lopez",
      type: "group",
      maxGuests: 6,
      allowPlusOne: false,
      isActive: true,
    });

    const inv3 = await ctx.db.insert("invitations", {
      eventId,
      title: "The Johnson Family",
      slug: "the-johnson-family",
      type: "group",
      maxGuests: 4,
      allowPlusOne: true,
      isActive: true,
    });

    const inv4 = await ctx.db.insert("invitations", {
      eventId,
      title: "Amigos del trabajo",
      slug: "amigos-del-trabajo",
      type: "group",
      maxGuests: 2,
      allowPlusOne: true,
      isActive: true,
    });

    const inv5 = await ctx.db.insert("invitations", {
      eventId,
      title: "Compañeros de universidad",
      slug: "companeros-de-universidad",
      type: "group",
      maxGuests: 4,
      allowPlusOne: false,
      isActive: true,
    });

    // Give some invitations access to special events
    await ctx.db.insert("invitationSpecialEventAccess", {
      eventId,
      invitationId: inv1,
      specialEventId: cenaEnsayo,
    });
    await ctx.db.insert("invitationSpecialEventAccess", {
      eventId,
      invitationId: inv2,
      specialEventId: cenaEnsayo,
    });
    await ctx.db.insert("invitationSpecialEventAccess", {
      eventId,
      invitationId: inv1,
      specialEventId: brunch,
    });
    await ctx.db.insert("invitationSpecialEventAccess", {
      eventId,
      invitationId: inv3,
      specialEventId: brunch,
    });

    // Create guests — Familia García (attending, with selections)
    const g1 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv1,
      firstName: "Carlos",
      lastName: "García",
      email: "carlos.garcia@email.com",
      isPrimaryContact: true,
      isPlusOne: false,
      rsvpStatus: "attending",
      menuOptionId: menuCarne,
      drinkOptionId: drinkVinos,
      tableId: table1,
      seatNumber: 0,
    });
    const g2 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv1,
      firstName: "Ana",
      lastName: "García",
      isPrimaryContact: false,
      isPlusOne: false,
      rsvpStatus: "attending",
      menuOptionId: menuVeg,
      drinkOptionId: drinkSinAlcohol,
      allergies: "Nueces",
      tableId: table1,
      seatNumber: 1,
    });

    // Familia López (mixed statuses)
    const g3 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv2,
      firstName: "Miguel",
      lastName: "López",
      email: "miguel.lopez@email.com",
      isPrimaryContact: true,
      isPlusOne: false,
      rsvpStatus: "attending",
      menuOptionId: menuPescado,
      drinkOptionId: drinkVinos,
      tableId: table1,
      seatNumber: 2,
    });
    const g4 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv2,
      firstName: "Elena",
      lastName: "López",
      isPrimaryContact: false,
      isPlusOne: false,
      rsvpStatus: "attending",
      menuOptionId: menuCarne,
      drinkOptionId: drinkOpenBar,
      tableId: table1,
      seatNumber: 3,
    });
    const g5 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv2,
      firstName: "Pablo",
      lastName: "López",
      isPrimaryContact: false,
      isPlusOne: false,
      rsvpStatus: "declined",
    });

    // The Johnson Family
    const g6 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv3,
      firstName: "John",
      lastName: "Johnson",
      email: "john.johnson@email.com",
      isPrimaryContact: true,
      isPlusOne: false,
      rsvpStatus: "attending",
      menuOptionId: menuCarne,
      drinkOptionId: drinkOpenBar,
      tableId: table2,
      seatNumber: 0,
    });
    const g7 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv3,
      firstName: "Sarah",
      lastName: "Johnson",
      isPrimaryContact: false,
      isPlusOne: false,
      rsvpStatus: "attending",
      menuOptionId: menuVeg,
      drinkOptionId: drinkSinAlcohol,
      allergies: "Gluten",
      tableId: table2,
      seatNumber: 1,
    });
    const g8 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv3,
      firstName: "Emma",
      lastName: "Johnson",
      isPrimaryContact: false,
      isPlusOne: true,
      rsvpStatus: "pending",
    });

    // Amigos del trabajo (pending)
    const g9 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv4,
      firstName: "Laura",
      lastName: "Martínez",
      email: "laura.m@email.com",
      isPrimaryContact: true,
      isPlusOne: false,
      rsvpStatus: "pending",
    });
    const g10 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv4,
      firstName: "David",
      lastName: "Sánchez",
      isPrimaryContact: false,
      isPlusOne: false,
      rsvpStatus: "attending",
      menuOptionId: menuPescado,
      drinkOptionId: drinkVinos,
      tableId: table2,
      seatNumber: 2,
    });

    // Compañeros de universidad
    const g11 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv5,
      firstName: "Sofía",
      lastName: "Fernández",
      email: "sofia.f@email.com",
      isPrimaryContact: true,
      isPlusOne: false,
      rsvpStatus: "attending",
      menuOptionId: menuVeg,
      drinkOptionId: drinkVinos,
      tableId: table3,
      seatNumber: 0,
    });
    const g12 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv5,
      firstName: "Javier",
      lastName: "Ruiz",
      isPrimaryContact: false,
      isPlusOne: false,
      rsvpStatus: "attending",
      menuOptionId: menuCarne,
      drinkOptionId: drinkOpenBar,
      tableId: table3,
      seatNumber: 1,
    });
    const g13 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv5,
      firstName: "Carmen",
      lastName: "Torres",
      isPrimaryContact: false,
      isPlusOne: false,
      rsvpStatus: "declined",
    });
    const g14 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv5,
      firstName: "Alejandro",
      lastName: "Morales",
      isPrimaryContact: false,
      isPlusOne: false,
      rsvpStatus: "pending",
    });
    const g15 = await ctx.db.insert("guests", {
      eventId,
      invitationId: inv5,
      firstName: "Isabel",
      lastName: "Jiménez",
      isPrimaryContact: false,
      isPlusOne: false,
      rsvpStatus: "attending",
      menuOptionId: menuPescado,
      drinkOptionId: drinkSinAlcohol,
      tableId: table3,
      seatNumber: 2,
    });

    // Add some special event RSVPs
    await ctx.db.insert("guestSpecialEventRsvps", {
      eventId,
      guestId: g1,
      specialEventId: cenaEnsayo,
      status: "attending",
    });
    await ctx.db.insert("guestSpecialEventRsvps", {
      eventId,
      guestId: g2,
      specialEventId: cenaEnsayo,
      status: "attending",
    });
    await ctx.db.insert("guestSpecialEventRsvps", {
      eventId,
      guestId: g3,
      specialEventId: cenaEnsayo,
      status: "attending",
    });
    await ctx.db.insert("guestSpecialEventRsvps", {
      eventId,
      guestId: g4,
      specialEventId: cenaEnsayo,
      status: "declined",
    });
    await ctx.db.insert("guestSpecialEventRsvps", {
      eventId,
      guestId: g1,
      specialEventId: brunch,
      status: "attending",
    });
    await ctx.db.insert("guestSpecialEventRsvps", {
      eventId,
      guestId: g6,
      specialEventId: brunch,
      status: "attending",
    });
    await ctx.db.insert("guestSpecialEventRsvps", {
      eventId,
      guestId: g7,
      specialEventId: brunch,
      status: "pending",
    });

    return eventId;
  },
});

export const seedDemoEventForCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const eventId: string = await ctx.runMutation(
      internal.seed.seedDemoEvent,
      { ownerTokenIdentifier: identity.tokenIdentifier }
    );

    return eventId;
  },
});
