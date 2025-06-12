import { loadQuery } from "react-relay";
import { relayEnvironment } from "/providers/RelayProviders";
import { PageSkeleton } from "/components/skeletons/PageSkeleton";
import { lazy } from "@probo/react-lazy";
import { dataQuery, datumNodeQuery } from "../hooks/graph/DatumGraph";

export const dataRoutes = [
  {
    path: "data",
    fallback: PageSkeleton,
    queryLoader: (params: Record<string, string>) =>
      loadQuery(relayEnvironment, dataQuery, { organizationId: params.organizationId }),
    Component: lazy(
      () => import("/pages/organizations/data/DataPage")
    ),
  },
  {
    path: "data/:dataId",
    fallback: PageSkeleton,
    queryLoader: (params: Record<string, string>) =>
      loadQuery(relayEnvironment, datumNodeQuery, { dataId: params.dataId }),
    Component: lazy(
      () => import("../pages/organizations/data/DatumDetailsPage")
    ),
  },
]
