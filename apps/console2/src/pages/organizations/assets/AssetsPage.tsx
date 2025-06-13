import {
  Button,
  IconPlusLarge,
  PageHeader,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  ActionDropdown,
  DropdownItem,
  IconTrashCan,
  Avatar,
} from "@probo/ui";
import { useTranslate } from "@probo/i18n";
import { usePageTitle } from "@probo/hooks";
import { type PreloadedQuery } from "react-relay";
import { useOrganizationId } from "/hooks/useOrganizationId";
import { CreateAssetDialog } from "./dialogs/CreateAssetDialog";
import { useDeleteAsset, useAssets } from "../../../hooks/graph/AssetGraph";
import type { AssetGraphListQuery } from "/hooks/graph/__generated__/AssetGraphListQuery.graphql";
import { faviconUrl } from "@probo/helpers";
import type { NodeOf } from "/types";
import { getAssetTypeVariant, getCriticityVariant } from "@probo/helpers";

type AssetEntry = NodeOf<NonNullable<NonNullable<AssetGraphListQuery["response"]["node"]>["assets"]>>;

type Props = {
  queryRef: PreloadedQuery<AssetGraphListQuery>;
};

export default function AssetsPage(props: Props) {
  const { __ } = useTranslate();
  const organizationId = useOrganizationId();

  const { assets, connectionId } = useAssets(props.queryRef);

  usePageTitle(__("Assets"));

  return (
    <div className="space-y-6">
      <PageHeader
        title={__("Assets")}
        description={__(
          "Manage your organization's assets and their classifications."
        )}
      >
        <CreateAssetDialog connection={connectionId} organizationId={organizationId}>
          <Button icon={IconPlusLarge}>{__("Add asset")}</Button>
        </CreateAssetDialog>
      </PageHeader>
      <Table>
        <Thead>
          <Tr>
            <Th>{__("Name")}</Th>
            <Th>{__("Type")}</Th>
            <Th>{__("Criticity")}</Th>
            <Th>{__("Amount")}</Th>
            <Th>{__("Owner")}</Th>
            <Th>{__("Vendors")}</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {assets.map((entry) => (
            <AssetRow
              key={entry.id}
              entry={entry}
              connectionId={connectionId}
            />
          ))}
        </Tbody>
      </Table>
    </div>
  );
}

function AssetRow({
  entry,
  connectionId,
}: {
  entry: AssetEntry;
  connectionId: string;
}) {
  const organizationId = useOrganizationId();
  const { __ } = useTranslate();
  const deleteAsset = useDeleteAsset(entry, connectionId);
  const vendors = entry.vendors?.edges.map(edge => edge.node) ?? [];

  return (
    <Tr to={`/organizations/${organizationId}/assets/${entry.id}`}>
      <Td>{entry.name}</Td>
      <Td>
        <Badge variant={getAssetTypeVariant(entry.assetType)}>
          {entry.assetType === "PHYSICAL" ? __("Physical") : __("Virtual")}
        </Badge>
      </Td>
      <Td>
        <Badge variant={getCriticityVariant(entry.criticity)}>
          {entry.criticity}
        </Badge>
      </Td>
      <Td>{entry.amount}</Td>
      <Td>{entry.owner?.fullName ?? __("Unassigned")}</Td>
      <Td>
        {vendors.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {vendors.slice(0, 3).map((vendor) => (
              <Badge key={vendor.id} variant="neutral" className="flex items-center gap-1">
                <Avatar
                  name={vendor.name}
                  src={faviconUrl(vendor.websiteUrl)}
                  size="s"
                />
                <span className="text-xs">{vendor.name}</span>
              </Badge>
            ))}
            {vendors.length > 3 && (
              <Badge variant="neutral" className="text-xs">
                +{vendors.length - 3}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-txt-secondary text-sm">{__("None")}</span>
        )}
      </Td>
      <Td noLink width={50} className="text-end">
        <ActionDropdown>
          <DropdownItem
            onClick={deleteAsset}
            variant="danger"
            icon={IconTrashCan}
          >
            {__("Delete")}
          </DropdownItem>
        </ActionDropdown>
      </Td>
    </Tr>
  );
}
