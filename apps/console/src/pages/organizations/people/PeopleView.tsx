"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  graphql,
  PreloadedQuery,
  usePreloadedQuery,
  useQueryLoader,
  useMutation,
} from "react-relay";
import { Suspense, useEffect, useState, useCallback } from "react";
import type { PeopleViewQuery as PeopleViewQueryType } from "./__generated__/PeopleViewQuery.graphql";
import { useParams } from "react-router";
import { PageTemplate } from "@/components/PageTemplate";
import { PeopleViewSkeleton } from "./PeoplePage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const peopleViewQuery = graphql`
  query PeopleViewQuery($peopleId: ID!) {
    node(id: $peopleId) {
      ... on People {
        id
        fullName
        primaryEmailAddress
        additionalEmailAddresses
        kind
        position
        contractStartDate
        contractEndDate
        createdAt
        updatedAt
      }
    }
  }
`;

const updatePeopleMutation = graphql`
  mutation PeopleViewUpdatePeopleMutation($input: UpdatePeopleInput!) {
    updatePeople(input: $input) {
      people {
        id
        fullName
        primaryEmailAddress
        additionalEmailAddresses
        kind
        position
        contractStartDate
        contractEndDate
        updatedAt
      }
    }
  }
`;

function EditableField({
  label,
  value,
  onChange,
  type = "text",
  helpText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  helpText?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm">{label}</Label>
      </div>
      <div className="space-y-2">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {helpText && <p className="text-sm text-secondary">{helpText}</p>}
      </div>
    </div>
  );
}

function PeopleViewContent({
  queryRef,
}: {
  queryRef: PreloadedQuery<PeopleViewQueryType>;
}) {
  const data = usePreloadedQuery(peopleViewQuery, queryRef);
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    fullName: data.node.fullName || "",
    primaryEmailAddress: data.node.primaryEmailAddress || "",
    additionalEmailAddresses: data.node.additionalEmailAddresses || [],
    kind: data.node.kind,
    position: data.node.position || "",
    contractStartDate: data.node.contractStartDate
      ? new Date(data.node.contractStartDate).toISOString().split('T')[0]
      : "",
    contractEndDate: data.node.contractEndDate
      ? new Date(data.node.contractEndDate).toISOString().split('T')[0]
      : "",
  });
  const [commit] = useMutation(updatePeopleMutation);
  const [, loadQuery] = useQueryLoader<PeopleViewQueryType>(peopleViewQuery);
  const { toast } = useToast();
  const hasChanges = editedFields.size > 0;

  const handleSave = useCallback(() => {
    const formattedData = {
      ...formData,
      position: formData.position,
      contractStartDate: formData.contractStartDate
        ? new Date(formData.contractStartDate).toISOString()
        : null,
      contractEndDate: formData.contractEndDate
        ? new Date(formData.contractEndDate).toISOString()
        : null,
    };

    commit({
      variables: {
        input: {
          id: data.node.id,
          ...formattedData,
        },
      },
      onCompleted: () => {
        toast({
          title: "Success",
          description: "Changes saved successfully",
          variant: "default",
        });
        setEditedFields(new Set());
      },
      onError: (error) => {
        const defaultErrorValues = {
          title: "Error",
          description: error.message || "Failed to save changes",
          variant: "destructive" as const
        };

        if (error.message?.includes("concurrent modification")) {
          toast({
            ...defaultErrorValues,
            description: "Someone else modified this person. Reloading latest data.",
          });
          loadQuery({ peopleId: data.node.id! });
        }
        else if (error.message?.includes("contract end date must be after or equal to start date")) {
          toast({
            ...defaultErrorValues,
            description:
              "Contract end date must be after or equal to start date.",
          });
        }
        else {
          toast(defaultErrorValues);
        }
      },
    });
  }, [commit, data.node.id, formData, loadQuery, toast]);

  const handleFieldChange = (field: keyof typeof formData, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setEditedFields((prev) => new Set(prev).add(field));
  };

  const handleCancel = () => {
    setFormData({
      fullName: data.node.fullName || "",
      primaryEmailAddress: data.node.primaryEmailAddress || "",
      additionalEmailAddresses: data.node.additionalEmailAddresses || [],
      kind: data.node.kind,
      position: data.node.position || "",
      contractStartDate: data.node.contractStartDate
        ? new Date(data.node.contractStartDate).toISOString().split('T')[0]
        : "",
      contractEndDate: data.node.contractEndDate
        ? new Date(data.node.contractEndDate).toISOString().split('T')[0]
        : "",
    });
    setEditedFields(new Set());
  };

  return (
    <PageTemplate title={formData.fullName}>
      <div className="space-y-6">
        <div className="max-w-4xl space-y-6">
          <EditableField
            label="Full Name"
            value={formData.fullName}
            onChange={(value) => handleFieldChange("fullName", value)}
          />

          <EditableField
            label="Primary Email"
            value={formData.primaryEmailAddress}
            type="email"
            onChange={(value) =>
              handleFieldChange("primaryEmailAddress", value)
            }
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Additional Email Addresses</Label>
            </div>
            <div className="space-y-2">
              {formData.additionalEmailAddresses.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const newEmails = [...formData.additionalEmailAddresses];
                      newEmails[index] = e.target.value;
                      handleFieldChange("additionalEmailAddresses", newEmails);
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newEmails =
                        formData.additionalEmailAddresses.filter(
                          (_, i) => i !== index,
                        );
                      handleFieldChange("additionalEmailAddresses", newEmails);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  handleFieldChange("additionalEmailAddresses", [
                    ...formData.additionalEmailAddresses,
                    "",
                  ]);
                }}
              >
                Add Email
              </Button>
            </div>
          </div>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg font-medium">Additional Information</h2>
                <p className="text-sm text-secondary">
                  Additional details about the person
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Kind</Label>
                  </div>
                  <Select
                    value={formData.kind}
                    onValueChange={(value) => handleFieldChange("kind", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select kind" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                      <SelectItem value="SERVICE_ACCOUNT">
                        Service Account
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <EditableField
                  label="Position"
                  value={formData.position}
                  type="text"
                  onChange={(value) => handleFieldChange("position", value)}
                />
                <EditableField
                  label="Contract Start Date"
                  value={formData.contractStartDate || ""}
                  type="date"
                  onChange={(value) =>
                    handleFieldChange(
                      "contractStartDate" as keyof typeof formData,
                      value,
                    )
                  }
                />

                <EditableField
                  label="Contract End Date"
                  value={formData.contractEndDate || ""}
                  type="date"
                  onChange={(value) =>
                    handleFieldChange(
                      "contractEndDate" as keyof typeof formData,
                      value,
                    )
                  }
                />
              </div>
            </div>
          </Card>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary text-invert hover:bg-primary/90"
              disabled={!hasChanges}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}

export default function PeopleView() {
  const { peopleId } = useParams();
  const [queryRef, loadQuery] =
    useQueryLoader<PeopleViewQueryType>(peopleViewQuery);

  useEffect(() => {
    loadQuery({ peopleId: peopleId! });
  }, [loadQuery, peopleId]);

  if (!queryRef) {
    return <PeopleViewSkeleton />;
  }

  return (
    <Suspense fallback={<PeopleViewSkeleton />}>
      <PeopleViewContent queryRef={queryRef} />
    </Suspense>
  );
}
