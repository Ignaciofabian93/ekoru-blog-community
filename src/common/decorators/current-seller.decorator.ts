import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentSeller = createParamDecorator(
  (data: unknown, context: ExecutionContext): string | undefined => {
    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext();
    return gqlContext.sellerId;
  },
);
