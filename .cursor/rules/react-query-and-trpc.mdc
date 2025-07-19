---
description: This rule enforces best practices for using react-query in React applications, covering code organization, performance, security, and testing.
globs: *.js,*.jsx,*.ts,*.tsx
alwaysApply: false
---
# react-query with tRPC Best Practices

This document outlines the best practices for using react-query in React applications, covering various aspects such as code organization, performance considerations, security, and testing.

# Project Tech Stack:
## ALWAYS USE THE FOLLOWING IN CONJUNCTION WITH EACHOTHER TO HAVE A SAFE CODEBASE WHERE WE CAN MOVE FAST AND BREAK NOTHING
- Next.js
- Typescript + ESlint
- Zod + Prisma + tRPC + React Query
- Prisma (supabase) + Redis
- ShadCN + TailwindCSS v4
- Vitest Unit Tests

## 1. Code Organization and Structure

Compared to our [classic React Query Integration](/docs/client/react) this client is simpler and more TanStack Query-native, providing factories for common TanStack React Query interfaces like QueryKeys, QueryOptions, and MutationOptions. We think it's the future and recommend using this over the classic client, <a href="/blog/introducing-tanstack-react-query-client">read the announcement post</a> for more information about this change.

## Quick example query

```tsx
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from './trpc';

function Users() {
  const trpc = useTRPC();

  const greetingQuery = useQuery(trpc.greeting.queryOptions({ name: 'Jerry' }));

  // greetingQuery.data === 'Hello Jerry'
}
```

## Usage

The philosophy of this client is to provide thin and type-safe factories which work natively and type-safely with Tanstack React Query. This means just by following the autocompletes the client gives you, you can focus on building just with the knowledge the [TanStack React Query docs](https://tanstack.com/query/latest/docs/framework/react/overview) provide.

```tsx
export default function Basics() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Create QueryOptions which can be passed to query hooks
  const myQueryOptions = trpc.path.to.query.queryOptions({ /** inputs */ })
  const myQuery = useQuery(myQueryOptions)
  // or:
  // useSuspenseQuery(myQueryOptions)
  // useInfiniteQuery(myQueryOptions)

  // Create MutationOptions which can be passed to useMutation
  const myMutationOptions = trpc.path.to.mutation.mutationOptions()
  const myMutation = useMutation(myMutationOptions)

  // Create a QueryKey which can be used to manipulated many methods
  // on TanStack's QueryClient in a type-safe manner
  const myQueryKey = trpc.path.to.query.queryKey()

  const invalidateMyQueryKey = () => {
    queryClient.invalidateQueries({ queryKey: myQueryKey })
  }

  return (
    // Your app here
  )
}
```

The `trpc` object is fully type-safe and will provide autocompletes for all the procedures in your `AppRouter`. At the end of the proxy, the following methods are available:

### `queryOptions` - querying data {#queryOptions}

Available for all query procedures. Provides a type-safe wrapper around [Tanstack's `queryOptions` function](https://tanstack.com/query/latest/docs/framework/react/reference/queryOptions). The first argument is the input for the procedure, and the second argument accepts any native Tanstack React Query options.

```ts
const queryOptions = trpc.path.to.query.queryOptions(
  {
    /** input */
  },
  {
    // Any Tanstack React Query options
    stateTime: 1000,
  },
);
```

You can additionally provide a `trpc` object to the `queryOptions` function to provide tRPC request options to the client.

```ts
const queryOptions = trpc.path.to.query.queryOptions(
  {
    /** input */
  },
  {
    trpc: {
      // Provide tRPC request options to the client
      context: {
        // see https://trpc.io/docs/client/links#managing-context
      },
    },
  },
);
```

The result can be passed to `useQuery` or `useSuspenseQuery` hooks or query client methods like `fetchQuery`, `prefetchQuery`, `prefetchInfiniteQuery`, `invalidateQueries`, etc.

### `infiniteQueryOptions` - querying infinite data {#infiniteQueryOptions}

Available for all query procedures that takes a cursor input. Provides a type-safe wrapper around [Tanstack's `infiniteQueryOptions` function](https://tanstack.com/query/latest/docs/framework/react/reference/infiniteQueryOptions). The first argument is the input for the procedure, and the second argument accepts any native Tanstack React Query options.

```ts
const infiniteQueryOptions = trpc.path.to.query.infiniteQueryOptions(
  {
    /** input */
  },
  {
    // Any Tanstack React Query options
    getNextPageParam: (lastPage, pages) => lastPage.nextCursor,
  },
);
```

### `queryKey` - getting the query key and performing operations on the query client {#queryKey}

Available for all query procedures. Allows you to access the query key in a type-safe manner.

```ts
const queryKey = trpc.path.to.query.queryKey();
```

Since Tanstack React Query uses fuzzy matching for query keys, you can also create a partial query key for any sub-path to match all queries belonging to a router:

```ts
const queryKey = trpc.router.pathKey();
```

Or even the root path to match all tRPC queries:

```ts
const queryKey = trpc.pathKey();
```

### `queryFilter` - creating query filters {#queryFilter}

Available for all query procedures. Allows creating [query filters](https://tanstack.com/query/latest/docs/framework/react/guides/filters#query-filters) in a type-safe manner.

```ts
const queryFilter = trpc.path.to.query.queryFilter(
  {
    /** input */
  },
  {
    // Any Tanstack React Query filter
    predicate: (query) => {
      query.state.data;
    },
  },
);
```

Like with query keys, if you want to run a filter across a whole router you can use `pathFilter` to target any sub-path.

```ts
const queryFilter = trpc.path.pathFilter({
  // Any Tanstack React Query filter
  predicate: (query) => {
    query.state.data;
  },
});
```

Useful for creating filters that can be passed to client methods like `queryClient.invalidateQueries` etc.

### `mutationOptions` - creating mutation options {#mutationOptions}

Available for all mutation procedures. Provides a type-safe identify function for constructing options that can be passed to `useMutation`.

```ts
const mutationOptions = trpc.path.to.mutation.mutationOptions({
  // Any Tanstack React Query options
  onSuccess: (data) => {
    // do something with the data
  },
});
```

### `mutationKey` - getting the mutation key {#mutationKey}

Available for all mutation procedures. Allows you to get the mutation key in a type-safe manner.

```ts
const mutationKey = trpc.path.to.mutation.mutationKey();
```

### `subscriptionOptions` - creating subscription options {#subscriptionOptions}

TanStack does not provide a subscription hook, so we continue to expose our own abstraction here which works with a [standard tRPC subscription setup](/docs/server/subscriptions).
Available for all subscription procedures. Provides a type-safe identify function for constructing options that can be passed to `useSubscription`.
Note that you need to have either the [`httpSubscriptionLink`](/docs/client/links/httpSubscriptionLink) or [`wsLink`](/docs/client/links/wsLink) configured in your tRPC client to use subscriptions.

```tsx
function SubscriptionExample() {
  const trpc = useTRPC();
  const subscription = useSubscription(
    trpc.path.to.subscription.subscriptionOptions(
      {
        /** input */
      },
      {
        enabled: true,
        onStarted: () => {
          // do something when the subscription is started
        },
        onData: (data) => {
          // you can handle the data here
        },
        onError: (error) => {
          // you can handle the error here
        },
        onConnectionStateChange: (state) => {
          // you can handle the connection state here
        },
      },
    ),
  );

  // Or you can handle the state here
  subscription.data; // The lastly received data
  subscription.error; // The lastly received error

  /**
   * The current status of the subscription.
   * Will be one of: `'idle'`, `'connecting'`, `'pending'`, or `'error'`.
   *
   * - `idle`: subscription is disabled or ended
   * - `connecting`: trying to establish a connection
   * - `pending`: connected to the server, receiving data
   * - `error`: an error occurred and the subscription is stopped
   */
  subscription.status;

  // Reset the subscription (if you have an error etc)
  subscription.reset();

  return <>{/* ... */}</>;
}
```

### Inferring Input and Output types

When you need to infer the input and output types for a procedure or router, there are 2 options available depending on the situation.

Infer the input and output types of a full router

```ts
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { AppRouter } from './path/to/server';

export type Inputs = inferRouterInputs<AppRouter>;
export type Outputs = inferRouterOutputs<AppRouter>;
```

Infer types for a single procedure

```ts
import type { inferInput, inferOutput } from '@trpc/tanstack-react-query';

function Component() {
  const trpc = useTRPC();

  type Input = inferInput<typeof trpc.path.to.procedure>;
  type Output = inferOutput<typeof trpc.path.to.procedure>;
}
```

### Accessing the tRPC client {#useTRPCClient}

If you used the [setup with React Context](/docs/client/tanstack-react-query/setup#3a-setup-the-trpc-context-provider), you can access the tRPC client using the `useTRPCClient` hook.

```tsx
import { useTRPCClient } from './trpc';

function Component() {
  const trpcClient = useTRPCClient();

  const result = await trpcClient.path.to.procedure.query({
    /** input */
  });
}
```

If you [setup without React Context](/docs/client/tanstack-react-query/setup#3b-setup-without-react-context),
you can import the global client instance directly instead.

```ts
import { client } from './trpc';

const result = await client.path.to.procedure.query({
  /** input */
});
```

### 5. Create a tRPC caller for Server Components

To prefetch queries from server components, we create a proxy from our router. You can also pass in a client if your router is on a separate server.

```tsx title='trpc/server.tsx'
import 'server-only'; // <-- ensure this file cannot be imported from the client

import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { cache } from 'react';
import { createTRPCContext } from './init';
import { makeQueryClient } from './query-client';
import { appRouter } from './routers/_app';

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});

// If your router is on a separate server, pass a client:
createTRPCOptionsProxy({
  client: createTRPCClient({
    links: [httpLink({ url: '...' })],
  }),
  queryClient: getQueryClient,
});
```

## Using your API

Now you can use your tRPC API in your app. While you can use the React Query hooks in client components just like you would in any other React app,
we can take advantage of the RSC capabilities by prefetching queries in a server component high up the tree. You may be familiar with this
concept as "render as you fetch" commonly implemented as loaders. This means the request fires as soon as possible but without suspending until
the data is needed by using the `useQuery` or `useSuspenseQuery` hooks.

This approach leverages Next.js App Router's streaming capabilities, initiating the query on the server and streaming data to the client as it becomes available.
It optimizes both the time to first byte in the browser and the data fetch time, resulting in faster page loads.
However, `greeting.data` may initially be `undefined` before the data streams in.

If you prefer to avoid this initial undefined state, you can `await` the `prefetchQuery` call.
This ensures the query on the client always has data on first render, but it comes with a tradeoff -
the page will load more slowly since the server must complete the query before sending HTML to the client.

```tsx title='app/page.tsx'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient, trpc } from '~/trpc/server';
import { ClientGreeting } from './client-greeting';

export default async function Home() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.hello.queryOptions({
      /** input */
    }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div>...</div>
      {/** ... */}
      <ClientGreeting />
    </HydrationBoundary>
  );
}
```

```tsx title='app/client-greeting.tsx'
'use client';

// <-- hooks can only be used in client components
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/client';

export function ClientGreeting() {
  const trpc = useTRPC();
  const greeting = useQuery(trpc.hello.queryOptions({ text: 'world' }));
  if (!greeting.data) return <div>Loading...</div>;
  return <div>{greeting.data.greeting}</div>;
}
```

:::tip
You can also create a `prefetch` and `HydrateClient` helper functions to make it a bit more consice and reusable:

```tsx title='trpc/server.tsx'
export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T,
) {
  const queryClient = getQueryClient();
  if (queryOptions.queryKey[1]?.type === 'infinite') {
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}
```

Then you can use it like this:

```tsx
import { HydrateClient, prefetch, trpc } from '~/trpc/server';

function Home() {
  prefetch(
    trpc.hello.queryOptions({
      /** input */
    }),
  );

  return (
    <HydrateClient>
      <div>...</div>
      {/** ... */}
      <ClientGreeting />
    </HydrateClient>
  );
}
```

:::

### Leveraging Suspense

You may prefer handling loading and error states using Suspense and Error Boundaries. You can do this by using the `useSuspenseQuery` hook.

```tsx title='app/page.tsx'
import { HydrateClient, prefetch, trpc } from '~/trpc/server';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ClientGreeting } from './client-greeting';

export default async function Home() {
  prefetch(trpc.hello.queryOptions());

  return (
    <HydrateClient>
      <div>...</div>
      {/** ... */}
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Suspense fallback={<div>Loading...</div>}>
          <ClientGreeting />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
```

```tsx title='app/client-greeting.tsx'
'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { trpc } from '~/trpc/client';

export function ClientGreeting() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.hello.queryOptions());
  return <div>{data.greeting}</div>;
}
```

### Getting data in a server component

If you need access to the data in a server component, we recommend creating a server caller and using it directly. Please note that this method is detached from your query client and does not
store the data in the cache. This means that you cannot use the data in a server component and expect it to be available in the client. This is
intentional and explained in more detail in the [Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr#data-ownership-and-revalidation)
guide.

```tsx title='trpc/server.tsx'
// ...
export const caller = appRouter.createCaller(createTRPCContext);
```

```tsx title='app/page.tsx'
import { caller } from '~/trpc/server';

export default async function Home() {
  const greeting = await caller.hello();
  //    ^? { greeting: string }

  return <div>{greeting.greeting}</div>;
}
```

If you **really** need to use the data both on the server as well as inside client components and understand the tradeoffs explained in the
[Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr#data-ownership-and-revalidation)
guide, you can use `fetchQuery` instead of `prefetch` to have the data both on the server as well as hydrating it down to the client:

```tsx title='app/page.tsx'
import { getQueryClient, HydrateClient, trpc } from '~/trpc/server';

export default async function Home() {
  const queryClient = getQueryClient();
  const greeting = await queryClient.fetchQuery(trpc.hello.queryOptions());

  // Do something with greeting on the server

  return (
    <HydrateClient>
      <div>...</div>
      {/** ... */}
      <ClientGreeting />
    </HydrateClient>
  );
}
```