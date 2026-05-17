import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const customerCreateSchema = z.object({
  type: z.enum(['B2B', 'B2C', 'INSTITUTION']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CHURNED', 'PROSPECT']).default('PROSPECT'),
  displayName: z.string().min(1),
  companyName: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  accountManagerId: z.string().optional().nullable(),
});

const customerUpdateSchema = customerCreateSchema.partial().extend({
  id: z.string(),
});

export const customerRouter = router({
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        type: z.enum(['B2B', 'B2C', 'INSTITUTION']).optional(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'CHURNED', 'PROSPECT']).optional(),
        tagIds: z.array(z.string()).optional(),
        accountManagerId: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(25),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      const i = input ?? {};
      if (i.type) where.type = i.type;
      if (i.status) where.status = i.status;
      if (i.accountManagerId) where.accountManagerId = i.accountManagerId;
      if (i.search) {
        where.OR = [
          { displayName: { contains: i.search, mode: 'insensitive' } },
          { companyName: { contains: i.search, mode: 'insensitive' } },
          { email: { contains: i.search, mode: 'insensitive' } },
          { phone: { contains: i.search } },
          { taxId: { contains: i.search } },
        ];
      }
      if (i.tagIds && i.tagIds.length) {
        where.tags = { some: { tagId: { in: i.tagIds } } };
      }
      const limit = i.limit ?? 25;
      const items = await ctx.prisma.customer.findMany({
        where,
        take: limit + 1,
        cursor: i.cursor ? { id: i.cursor } : undefined,
        orderBy: { updatedAt: 'desc' },
        include: {
          tags: { include: { tag: true } },
          accountManager: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { contactPersons: true, leads: true, notesList: true } },
        },
      });
      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }
      return { items, nextCursor };
    }),

  byId: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const customer = await ctx.prisma.customer.findUnique({
      where: { id: input.id },
      include: {
        contactPersons: true,
        addresses: true,
        tags: { include: { tag: true } },
        documents: { orderBy: { createdAt: 'desc' } },
        meetings: { orderBy: { startsAt: 'desc' }, take: 20 },
        notesList: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        },
        leads: {
          include: { stage: true, pipeline: true },
          orderBy: { updatedAt: 'desc' },
        },
        relationsFrom: { include: { to: { select: { id: true, displayName: true } } } },
        relationsTo: { include: { from: { select: { id: true, displayName: true } } } },
        followUps: { orderBy: { dueAt: 'asc' }, take: 10 },
        accountManager: { select: { id: true, name: true, email: true, avatarUrl: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { actor: { select: { id: true, name: true } } },
        },
      },
    });
    if (!customer) throw new TRPCError({ code: 'NOT_FOUND' });
    return customer;
  }),

  create: protectedProcedure.input(customerCreateSchema).mutation(async ({ ctx, input }) => {
    const data = { ...input, email: input.email || null };
    const c = await ctx.prisma.customer.create({ data });
    await ctx.prisma.activity.create({
      data: { customerId: c.id, actorId: ctx.user.id, kind: 'CREATED' },
    });
    return c;
  }),

  update: protectedProcedure.input(customerUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const data: any = { ...rest };
    if (data.email === '') data.email = null;
    const c = await ctx.prisma.customer.update({ where: { id }, data });
    await ctx.prisma.activity.create({
      data: { customerId: c.id, actorId: ctx.user.id, kind: 'UPDATED', payload: rest },
    });
    return c;
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.prisma.customer.delete({ where: { id: input.id } });
  }),

  // ===== Contact persons =====
  addContactPerson: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        fullName: z.string(),
        role: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        isPrimary: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.contactPerson.create({
        data: { ...input, email: input.email || null },
      });
    }),

  removeContactPerson: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.contactPerson.delete({ where: { id: input.id } });
    }),

  // ===== Addresses =====
  addAddress: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        label: z.string().optional(),
        street: z.string(),
        city: z.string(),
        region: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().default('IL'),
        isPrimary: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => ctx.prisma.address.create({ data: input })),

  // ===== Notes =====
  addNote: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        body: z.string().min(1),
        kind: z.enum(['GENERAL', 'CALL', 'MEETING', 'EMAIL', 'WHATSAPP']).default('GENERAL'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.create({
        data: { ...input, authorId: ctx.user.id },
      });
      await ctx.prisma.activity.create({
        data: { customerId: input.customerId, actorId: ctx.user.id, kind: 'NOTE_ADDED', payload: { noteId: note.id } },
      });
      return note;
    }),

  // ===== Tags =====
  addTag: protectedProcedure
    .input(z.object({ customerId: z.string(), tagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const t = await ctx.prisma.customerTag.upsert({
        where: { customerId_tagId: input },
        update: {},
        create: input,
      });
      await ctx.prisma.activity.create({
        data: { customerId: input.customerId, actorId: ctx.user.id, kind: 'TAG_ADDED', payload: { tagId: input.tagId } },
      });
      return t;
    }),

  removeTag: protectedProcedure
    .input(z.object({ customerId: z.string(), tagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.customerTag.delete({ where: { customerId_tagId: input } });
      await ctx.prisma.activity.create({
        data: { customerId: input.customerId, actorId: ctx.user.id, kind: 'TAG_REMOVED', payload: { tagId: input.tagId } },
      });
      return { ok: true };
    }),

  // ===== Relations =====
  addRelation: protectedProcedure
    .input(
      z.object({
        fromId: z.string(),
        toId: z.string(),
        kind: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => ctx.prisma.relation.create({ data: input })),

  // ===== Documents =====
  addDocument: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        title: z.string(),
        url: z.string().url(),
        kind: z.enum(['CONTRACT', 'PROPOSAL', 'INVOICE', 'ID', 'OTHER']).default('OTHER'),
        mimeType: z.string().optional(),
        sizeBytes: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.prisma.document.create({ data: input });
      await ctx.prisma.activity.create({
        data: { customerId: input.customerId, actorId: ctx.user.id, kind: 'DOC_ADDED', payload: { docId: doc.id } },
      });
      return doc;
    }),

  // ===== Account manager =====
  assignAccountManager: protectedProcedure
    .input(z.object({ customerId: z.string(), userId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const c = await ctx.prisma.customer.update({
        where: { id: input.customerId },
        data: { accountManagerId: input.userId },
      });
      await ctx.prisma.activity.create({
        data: { customerId: input.customerId, actorId: ctx.user.id, kind: 'ASSIGNED', payload: { userId: input.userId } },
      });
      return c;
    }),
});
