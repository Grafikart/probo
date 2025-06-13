import { loadQuery } from "react-relay";
import { relayEnvironment } from "/providers/RelayProviders";
import { PageSkeleton } from "/components/skeletons/PageSkeleton";
import { lazy } from "@probo/react-lazy";
import { assetsQuery, assetNodeQuery } from "../hooks/graph/AssetGraph";

export const assetRoutes = [
  {
    path: "assets",
    fallback: PageSkeleton,
    queryLoader: (params: Record<string, string>) =>
      loadQuery(relayEnvironment, assetsQuery, { organizationId: params.organizationId }),
    Component: lazy(
      () => import("/pages/organizations/assets/AssetsPage")
    ),
  },
  {
    path: "assets/:assetId",
    fallback: PageSkeleton,
    queryLoader: (params: Record<string, string>) =>
      loadQuery(relayEnvironment, assetNodeQuery, { assetId: params.assetId }),
    Component: lazy(
      () => import("/pages/organizations/assets/AssetDetailsPage")
    ),
  },
];
