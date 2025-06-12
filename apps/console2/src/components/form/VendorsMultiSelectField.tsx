import { Avatar, Field, Option, Select, Badge, Button, IconCrossLargeX } from "@probo/ui";
import { Suspense, useState, type ComponentProps } from "react";
import { useTranslate } from "@probo/i18n";
import { type Control, Controller } from "react-hook-form";
import { useVendors } from "/hooks/graph/VendorGraph.ts";
import { faviconUrl } from "@probo/helpers";

type Props = {
  organizationId: string;
  control: Control<any>;
  name: string;
  label?: string;
  error?: string;
} & ComponentProps<typeof Field>;

export function VendorsMultiSelectField({
  organizationId,
  control,
  ...props
}: Props) {
  return (
    <Field {...props}>
      <Suspense
        fallback={<Select variant="editor" disabled placeholder="Loading..." />}
      >
        <VendorsMultiSelectWithQuery
          organizationId={organizationId}
          control={control}
          name={props.name}
          disabled={props.disabled}
        />
      </Suspense>
    </Field>
  );
}

function VendorsMultiSelectWithQuery(
  props: Pick<Props, "organizationId" | "control" | "name" | "disabled">
) {
  const { __ } = useTranslate();
  const { name, organizationId, control } = props;
  const vendors = useVendors(organizationId);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selectedVendorIds = Array.isArray(field.value) ? field.value : [];
          const selectedVendors = vendors.filter(v => selectedVendorIds.includes(v.id));
          const availableVendors = vendors.filter(v => !selectedVendorIds.includes(v.id));

          const handleAddVendor = (vendorId: string) => {
            const newValue = [...selectedVendorIds, vendorId];
            field.onChange(newValue);
            setIsOpen(false);
          };

          const handleRemoveVendor = (vendorId: string) => {
            const newValue = selectedVendorIds.filter((id: string) => id !== vendorId);
            field.onChange(newValue);
          };

          return (
            <div className="space-y-2">
              {availableVendors.length > 0 && (
                <Select
                  disabled={props.disabled}
                  id={name}
                  variant="editor"
                  placeholder={__("Add vendors...")}
                  onValueChange={handleAddVendor}
                  key={`${selectedVendorIds.length}-${vendors.length}`}
                  className="w-full"
                  value=""
                  open={isOpen}
                  onOpenChange={setIsOpen}
                >
                  {availableVendors.map((vendor) => (
                    <Option key={vendor.id} value={vendor.id} className="flex gap-2">
                      <Avatar
                        name={vendor.name}
                        src={faviconUrl(vendor.websiteUrl)}
                        size="s"
                      />
                      <div className="flex flex-col">
                        <span>{vendor.name}</span>
                        {vendor.websiteUrl && (
                          <span className="text-xs text-txt-secondary">
                            {vendor.websiteUrl}
                          </span>
                        )}
                      </div>
                    </Option>
                  ))}
                </Select>
              )}

              {selectedVendors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedVendors.map((vendor) => (
                    <Badge key={vendor.id} variant="neutral" className="flex items-center gap-2">
                      <Avatar
                        name={vendor.name}
                        src={faviconUrl(vendor.websiteUrl)}
                        size="s"
                      />
                      <span>{vendor.name}</span>
                      <Button
                        variant="tertiary"
                        icon={IconCrossLargeX}
                        onClick={() => handleRemoveVendor(vendor.id)}
                        className="h-4 w-4 p-0 hover:bg-transparent"
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {selectedVendors.length === 0 && availableVendors.length === 0 && (
                <div className="text-sm text-txt-secondary py-2">
                  {__("No vendors available")}
                </div>
              )}
            </div>
          );
        }}
      />
    </>
  );
}
