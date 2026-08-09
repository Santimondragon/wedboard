"use client";

import { Component, type ReactNode } from "react";
import { StateBlock } from "@/components/app/state-block";

interface QueryErrorBoundaryProps {
  /** Headline for the error state. */
  title?: string;
  /** One sentence of context. */
  description?: string;
  /** Render the state inline (tighter padding). */
  compact?: boolean;
  children: ReactNode;
}

interface QueryErrorBoundaryState {
  failed: boolean;
}

/**
 * Local error surface for a single async region.
 *
 * Convex's `useQuery` throws on failure rather than returning an error value,
 * so without a boundary a permission error or a dropped subscription takes out
 * the whole route via `app/(dashboard)/error.tsx`. Wrapping just the data
 * region keeps the page header and its actions usable and renders the failure
 * as a `StateBlock` with a retry that remounts the subtree.
 */
export class QueryErrorBoundary extends Component<
  QueryErrorBoundaryProps,
  QueryErrorBoundaryState
> {
  state: QueryErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): QueryErrorBoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <StateBlock
          kind="error"
          title={this.props.title ?? "Couldn't load this data"}
          description={
            this.props.description ??
            "The request failed. Check your connection and try again."
          }
          compact={this.props.compact}
          retry={() => this.setState({ failed: false })}
        />
      );
    }

    return this.props.children;
  }
}
