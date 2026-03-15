import { COOKIE_NAME } from "@shared/const";
import { publicProcedure, router } from "./_core/trpc";
import { recipesRouter } from "./features/recipes";

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ?? null),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        path: "/",
        maxAge: -1,
      });
      return { success: true } as const;
    }),
  }),
  recipes: recipesRouter,
});

export type AppRouter = typeof appRouter;
