import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentSeller = createParamDecorator(
  (data: unknown, context: ExecutionContext): string | undefined => {
    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext<{ sellerId?: string }>();
    return gqlContext.sellerId;
  },
);

export const CurrentAdmin = createParamDecorator(
  (data: unknown, context: ExecutionContext): string | undefined => {
    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext<{ adminId?: string }>();
    return gqlContext.adminId;
  },
);

/** Request language from Accept-Language (e.g. 'ES'), resolved in the context factory. */
export const CurrentLanguage = createParamDecorator(
  (data: unknown, context: ExecutionContext): string | undefined => {
    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext<{ language?: string }>();
    return gqlContext.language;
  },
);
