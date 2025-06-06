import { Suspense, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  graphql,
  PreloadedQuery,
  usePreloadedQuery,
  useQueryLoader,
  useMutation,
  useFragment,
} from "react-relay";
import {
  Clock,
  Download,
  Edit,
  Trash2,
  MoreHorizontal,
  X,
  FileSignature,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PageTemplate } from "@/components/PageTemplate";
import type { ShowDocumentViewQuery } from "./__generated__/ShowDocumentViewQuery.graphql";
import { ShowDocumentViewPublishMutation } from "./__generated__/ShowDocumentViewPublishMutation.graphql";
import { ShowDocumentViewCreateDraftMutation } from "./__generated__/ShowDocumentViewCreateDraftMutation.graphql";
import { ShowDocumentViewUpdateDocumentMutation } from "./__generated__/ShowDocumentViewUpdateDocumentMutation.graphql";
import { ShowDocumentViewGenerateChangelogMutation } from "./__generated__/ShowDocumentViewGenerateChangelogMutation.graphql";
import type { DocumentType } from "./__generated__/DocumentListViewCreateMutation.graphql";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShowDocumentViewSkeleton } from "./ShowDocumentPage";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignaturesModal } from "./SignaturesModal";
import { VersionHistoryModal } from "./VersionHistoryModal";
import rehypeRaw from "rehype-raw";
import { createRoot } from "react-dom/client";
import { documentVersionsFragment } from "./SignaturesModal";
import type { SignaturesModal_documentVersions$key } from "./__generated__/SignaturesModal_documentVersions.graphql";
import PeopleSelector from "@/components/PeopleSelector";
import { Label } from "@/components/ui/label";

const documentViewQuery = graphql`
  query ShowDocumentViewQuery($documentId: ID!, $organizationId: ID!) {
    organization: node(id: $organizationId) {
      ... on Organization {
        name
        ...PeopleSelector_organization
      }
    }

    node(id: $documentId) {
      id
      ... on Document {
        title
        description
        createdAt
        updatedAt
        currentPublishedVersion
        documentType
        owner {
          id
          fullName
          primaryEmailAddress
        }

        ...SignaturesModal_documentVersions
        ...VersionHistoryModal_documentVersions

        latestVersion: versions(first: 1) {
          edges {
            node {
              id
              version
              status
              content
              changelog
              publishedAt
              title
              owner {
                fullName
              }
              publishedBy {
                fullName
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    }
  }
`;

const publishDocumentVersionMutation = graphql`
  mutation ShowDocumentViewPublishMutation($input: PublishDocumentVersionInput!) {
    publishDocumentVersion(input: $input) {
      document {
        id
        currentPublishedVersion
      }
      documentVersion {
        id
        status
        publishedAt
        changelog
        publishedBy {
          fullName
        }
      }
    }
  }
`;

const createDraftDocumentVersionMutation = graphql`
  mutation ShowDocumentViewCreateDraftMutation(
    $input: CreateDraftDocumentVersionInput!
  ) {
    createDraftDocumentVersion(input: $input) {
      documentVersionEdge {
        node {
          id
          version
          status
        }
      }
    }
  }
`;

const updateDocumentMutation = graphql`
  mutation ShowDocumentViewUpdateDocumentMutation($input: UpdateDocumentInput!) {
    updateDocument(input: $input) {
      document {
        id
        documentType
        title
        owner {
          id
          fullName
          primaryEmailAddress
        }
      }
    }
  }
`;

const generateChangelogMutation = graphql`
  mutation ShowDocumentViewGenerateChangelogMutation($input: GenerateDocumentChangelogInput!) {
    generateDocumentChangelog(input: $input) {
      changelog
    }
  }
`;

function ShowDocumentContent({
  queryRef,
}: {
  queryRef: PreloadedQuery<ShowDocumentViewQuery>;
}) {
  const data = usePreloadedQuery<ShowDocumentViewQuery>(
    documentViewQuery,
    queryRef,
  );
  const documentValue = data.node;
  const { organizationId } = useParams();

  const navigate = useNavigate();
  const { toast } = useToast();
  const [queryRef2, loadQuery] =
    useQueryLoader<ShowDocumentViewQuery>(documentViewQuery);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isSignaturesModalOpen, setIsSignaturesModalOpen] = useState(false);
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(documentValue.title || '');
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishChangelog, setPublishChangelog] = useState('');
  const [isGeneratingChangelog, setIsGeneratingChangelog] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  // Keep editedTitle in sync with documentValue.title
  useEffect(() => {
    setEditedTitle(documentValue.title || '');
  }, [documentValue.title]);

  const [publishDraft, isPublishInFlight] =
    useMutation<ShowDocumentViewPublishMutation>(publishDocumentVersionMutation);
  const [createDraft, isCreateDraftInFlight] =
    useMutation<ShowDocumentViewCreateDraftMutation>(
      createDraftDocumentVersionMutation,
    );
  const [updateDocument, isUpdatingDocument] =
    useMutation<ShowDocumentViewUpdateDocumentMutation>(updateDocumentMutation);
  const [generateChangelog] = useMutation<ShowDocumentViewGenerateChangelogMutation>(generateChangelogMutation);

  const latestVersionEdge = documentValue.latestVersion?.edges[0];
  const latestVersionNode = latestVersionEdge?.node;

  const isDraft = latestVersionNode?.status === "DRAFT";

  // Handle owner update
  const handleOwnerUpdate = useCallback((newOwnerId: string) => {
    if (!documentValue.id) return;

    updateDocument({
      variables: {
        input: {
          id: documentValue.id,
          title: documentValue.title,
          content: documentValue.latestVersion?.edges[0]?.node?.content || '',
          ownerId: newOwnerId,
        },
      },
      onCompleted: (_, errors) => {
        if (errors) {
          toast({
            title: "Error updating owner",
            description: errors[0]?.message || "An unknown error occurred",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: "Document owner updated successfully",
        });
        setIsEditingOwner(false);

        // Reload the query to refresh the data
        loadQuery({ documentId: documentValue.id, organizationId: organizationId! });
      },
      onError: (error) => {
        toast({
          title: "Error updating owner",
          description: error.message || "An unknown error occurred",
          variant: "destructive",
        });
      },
    });
  }, [documentValue.id, updateDocument, toast, loadQuery, organizationId]);

  // Handle document type update
  const handleTypeUpdate = useCallback((newType: DocumentType) => {
    if (!documentValue.id) return;

    updateDocument({
      variables: {
        input: {
          id: documentValue.id,
          documentType: newType,
        },
      },
      onCompleted: (_, errors) => {
        if (errors) {
          toast({
            title: "Error updating document type",
            description: errors[0]?.message || "An unknown error occurred",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: "Document type updated successfully",
        });
        setIsEditingType(false);

        // Reload the query to refresh the data
        loadQuery({ documentId: documentValue.id, organizationId: organizationId! });
      },
      onError: (error) => {
        toast({
          title: "Error updating document type",
          description: error.message || "An unknown error occurred",
          variant: "destructive",
        });
      },
    });
  }, [documentValue.id, updateDocument, toast, loadQuery, organizationId]);

  useEffect(() => {
    // No need to update selectedVersion state since we're using the VersionHistoryModal component
  }, []);

  // Handle delete document
  const handleDeleteDocument = useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  // Confirm delete document
  const confirmDeleteDocument = useCallback(() => {
    setIsDeleting(true);

    setTimeout(() => {
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully",
      });
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      navigate(`/organizations/${organizationId}/documents`);
    }, 1000);
  }, [toast, navigate, organizationId]);

  // Navigate to publish flow
  const handlePublish = useCallback(() => {
    setIsPublishDialogOpen(true);
    setPublishChangelog("");

    // Generate changelog
    setIsGeneratingChangelog(true);

    generateChangelog({
      variables: {
        input: {
          documentId: documentValue.id,
        },
      },
      onCompleted: (response, errors) => {
        setIsGeneratingChangelog(false);
        if (errors) {
          toast({
            title: "Error",
            description: errors[0]?.message || "An unknown error occurred",
            variant: "destructive",
          });
          return;
        }

        const generatedChangelog = response.generateDocumentChangelog.changelog;
        setPublishChangelog(prev => {
          if (prev.trim()) {
            return `${prev}\n${generatedChangelog}`;
          }
          return generatedChangelog;
        });
      },
      onError: (error) => {
        setIsGeneratingChangelog(false);
        toast({
          title: "Error",
          description: error.message || "An unknown error occurred",
          variant: "destructive",
        });
      },
    });
  }, [documentValue.id, generateChangelog, toast]);

  // Confirm publish
  const confirmPublish = useCallback(() => {
    if (!documentValue.id) return;

    publishDraft({
      variables: {
        input: {
          documentId: documentValue.id,
          changelog: publishChangelog,
        },
      },
      onCompleted: (_, errors) => {
        if (errors) {
          toast({
            title: "Error publishing document",
            description: errors[0]?.message || "An unknown error occurred",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Document published",
          description: `The document has been published successfully`,
        });

        setIsPublishDialogOpen(false);
        // Reload the query to refresh the data
        loadQuery({ documentId: documentValue.id, organizationId: organizationId! });
      },
      onError: (error) => {
        toast({
          title: "Error publishing document",
          description: error.message || "An unknown error occurred",
          variant: "destructive",
        });
      },
    });
  }, [documentValue.id, publishDraft, toast, loadQuery, publishChangelog, organizationId]);

  // Open version history modal
  const handleVersionHistoryClick = useCallback(() => {
    setIsVersionHistoryOpen(true);
  }, []);

  // Restore version
  const handleRestoreVersion = useCallback(
    (versionNumber: number) => {
      // Here you would implement the logic to restore a version
      toast({
        title: "Version restored",
        description: `Version ${versionNumber} has been restored`,
      });
      setIsVersionHistoryOpen(false);
      // Reload the query to refresh the data
      if (documentValue.id) {
        loadQuery({ documentId: documentValue.id, organizationId: organizationId! });
      }
    },
    [documentValue.id, loadQuery, toast],
  );

  // Handle edit document
  const handleEditDocument = useCallback(() => {
    if (!documentValue.id) return;

    if (latestVersionNode?.status === "PUBLISHED") {
      // Create a new draft version first
      createDraft({
        variables: {
          input: {
            documentID: documentValue.id,
          },
        },
        onCompleted: (response, errors) => {
          if (errors) {
            toast({
              title: "Error creating draft",
              description: errors[0]?.message || "An unknown error occurred",
              variant: "destructive",
            });
            return;
          }

          const newDraftId =
            response.createDraftDocumentVersion.documentVersionEdge.node.id;
          navigate(
            `/organizations/${organizationId}/documents/${documentValue.id}/versions/${newDraftId}/edit`,
          );
        },
        onError: (error) => {
          toast({
            title: "Error creating draft",
            description: error.message || "An unknown error occurred",
            variant: "destructive",
          });
        },
      });
    } else {
      // Navigate directly to edit if it's already a draft
      navigate(
        `/organizations/${organizationId}/documents/${documentValue.id}/versions/${latestVersionNode?.id}/edit`,
      );
    }
  }, [
    documentValue.id,
    latestVersionNode,
    createDraft,
    navigate,
    organizationId,
    toast,
  ]);

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy");
  };

  // Get document signatures data
  const documentData = useFragment<SignaturesModal_documentVersions$key>(
    documentVersionsFragment,
    documentValue as unknown as SignaturesModal_documentVersions$key
  );

  // Handle PDF download
  const handlePrintPDF = useCallback(() => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Unable to open print window. Please check your browser settings.",
        variant: "destructive",
      });
      return;
    }

    // Get version nodes and signatures from the fragment data we have
    const versionNodes = documentData?.documentVersions?.edges?.map(edge => edge.node) || [];
    const currentVersion = versionNodes.find(v => v.version === latestVersionNode?.version);
    const signatures = currentVersion?.signatures?.edges?.map(edge => edge.node) || [];

    // Create temporary div to render and capture markdown
    const tempDiv = window.document.createElement('div');
    const root = createRoot(tempDiv);

    // Render the markdown content to HTML
    root.render(
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {latestVersionNode?.content || 'No content available'}
      </ReactMarkdown>
    );

    // Give React a moment to render the content
    setTimeout(() => {
      const renderedMarkdown = tempDiv.innerHTML;

      // Prepare signatures HTML
      let signaturesHtml = '<p>No signatures yet</p>';
      if (signatures.length > 0) {
        signaturesHtml = `
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Name</th>
                <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Status</th>
                <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${signatures.map(sig => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${sig.signedBy?.fullName || 'Unknown'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${sig.state === 'SIGNED' ? 'Signed' : 'Pending'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${sig.signedAt ? formatDate(sig.signedAt) : 'Not yet signed'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      // Create the print document content with the document document data
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${documentValue.title || 'Document Document'}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; }
              .header { margin-bottom: 30px; }
              .content { margin-bottom: 40px; }
              .footer { border-top: 1px solid #ccc; padding-top: 20px; }
              .metadata { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 4px; }
              .metadata-item { margin-bottom: 5px; }
              .signature-title { margin-top: 20px; font-weight: bold; font-size: 1.2em; margin-bottom: 10px; }
              h1 { font-size: 24px; margin-bottom: 20px; }
              .company-name { font-size: 16px; color: #555; margin-bottom: 5px; }

              /* Markdown styles */
              .content h1 { font-size: 1.8em; margin-top: 1em; margin-bottom: 0.5em; }
              .content h2 { font-size: 1.5em; margin-top: 1em; margin-bottom: 0.5em; }
              .content h3 { font-size: 1.3em; margin-top: 1em; margin-bottom: 0.5em; }
              .content h4 { font-size: 1.2em; margin-top: 1em; margin-bottom: 0.5em; }
              .content h5 { font-size: 1.1em; margin-top: 1em; margin-bottom: 0.5em; }
              .content h6 { font-size: 1em; margin-top: 1em; margin-bottom: 0.5em; }
              .content p { margin-bottom: 1em; line-height: 1.6; }
              .content ul, .content ol { margin-bottom: 1em; padding-left: 2em; }
              .content li { margin-bottom: 0.5em; }
              .content blockquote { border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; }
              .content pre { background: #f4f4f4; padding: 1em; overflow-x: auto; }
              .content code { background: #f4f4f4; padding: 0.2em 0.4em; }
              .content table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
              .content th, .content td { border: 1px solid #ccc; padding: 0.5em; }
              .content th { background: #f4f4f4; }

              @media print {
                body { margin: 0; }
                .page-break { page-break-after: always; }
                /* Hide browser default headers and footers */
                @page {
                  margin: 0;
                  size: auto;
                }
                html {
                  background-color: #FFFFFF;
                  margin: 0px;
                }
                body {
                  margin: 40px;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${documentValue.title || 'Document Document'}</h1>
              <div class="metadata">
                <div class="metadata-item"><strong>Version:</strong> ${latestVersionNode?.version || 'N/A'}</div>
                <div class="metadata-item"><strong>Status:</strong> ${latestVersionNode?.status === 'PUBLISHED' ? 'Published' : 'Draft'}</div>
                <div class="metadata-item"><strong>Published Date:</strong> ${latestVersionNode?.status === 'PUBLISHED' ? formatDate(latestVersionNode.publishedAt || '') : 'Not yet published'}</div>
                <div class="metadata-item"><strong>Owner:</strong> ${documentValue.owner?.fullName || 'Unknown'}</div>
                <div class="metadata-item"><strong>Last Modified:</strong> ${formatDate(latestVersionNode?.updatedAt)}</div>
                <div class="metadata-item"><strong>Company:</strong> ${data.organization.name}</div>
              </div>
            </div>
            <div class="content">
              ${renderedMarkdown}
            </div>
            <div class="footer">
              <div class="signature-title">Signatory</div>
              ${signaturesHtml}
            </div>
          </body>
        </html>
      `);

      // Trigger print
      printWindow.document.close();
      printWindow.focus();

      // Use setTimeout to give the browser time to load any resources
      setTimeout(() => {
        printWindow.print();
        // Optional: close the window after printing
        // printWindow.close();
      }, 500);

      // Clean up
      root.unmount();
    }, 100);

  }, [documentValue, latestVersionNode, formatDate, toast, documentData, data.organization.name!]);

  return (
    <PageTemplate
      title={documentValue.title!}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-9 px-3 gap-1.5 shadow-sm border-[#022A0214] bg-white text-[#141E12]"
            onClick={handlePrintPDF}
          >
            <Download className="h-4 w-4" />
            <span className="font-medium">Download PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-9 px-3 gap-1.5 shadow-sm border-[#022A0214] bg-white text-[#141E12]"
            onClick={handleVersionHistoryClick}
          >
            <Clock className="h-4 w-4" />
            <span className="font-medium">Version history</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-9 px-3 gap-1.5 shadow-sm border-[#022A0214] bg-white text-[#141E12]"
            onClick={() => setIsSignaturesModalOpen(true)}
          >
            <FileSignature className="h-4 w-4" />
            <span className="font-medium">Signature history</span>
          </Button>

          {isDraft && (
            <Button
              variant="default"
              size="sm"
              className="rounded-full h-9 px-3 gap-1.5 shadow-sm"
              onClick={handlePublish}
              disabled={isPublishInFlight}
            >
              <span className="font-medium">Publish version</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-9 w-9 shadow-sm border-[#022A0214] bg-white text-[#141E12]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <div onClick={handleEditDocument}>
                  <Edit className="mr-2 h-4 w-4" />
                  {latestVersionNode?.status === "PUBLISHED"
                    ? "Create new draft"
                    : "Edit draft document"}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeleteDocument}
                className="text-danger focus:text-danger focus:bg-danger-bg"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="space-y-4">
        {latestVersionNode ? (
          <>
            <div className="bg-gray-50 rounded-lg border border-solid-b shadow-sm p-6 mb-4">
              <div className="grid grid-cols-2 gap-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Document Title:</span>
                    {isEditingTitle ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="h-9 w-[250px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          placeholder="Enter document title"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (editedTitle.trim()) {
                              updateDocument({
                                variables: {
                                  input: {
                                    id: documentValue.id,
                                    title: editedTitle.trim(),
                                  },
                                },
                                onCompleted: (_, errors) => {
                                  if (errors) {
                                    toast({
                                      title: "Error updating title",
                                      description: errors[0]?.message || "An unknown error occurred",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  toast({
                                    title: "Success",
                                    description: "Document title updated successfully",
                                  });
                                  setIsEditingTitle(false);
                                  loadQuery({ documentId: documentValue.id, organizationId: organizationId! });
                                },
                                onError: (error) => {
                                  toast({
                                    title: "Error updating title",
                                    description: error.message || "An unknown error occurred",
                                    variant: "destructive",
                                  });
                                },
                              });
                            }
                          }}
                          disabled={!editedTitle.trim() || isUpdatingDocument}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingTitle(false);
                            setEditedTitle(documentValue.title || '');
                          }}
                          disabled={isUpdatingDocument}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{documentValue.title}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingTitle(true)}
                        >
                          Change
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Version:</span> {latestVersionNode.version || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {latestVersionNode.status === "PUBLISHED" ? "Published" : "Draft"}
                </div>
                <div>
                  <span className="font-medium">Published Date:</span> {latestVersionNode.status === "PUBLISHED" ? formatDate(latestVersionNode.publishedAt || "") : "Not yet published"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Owner:</span>
                    {isEditingOwner ? (
                      <div className="flex items-center gap-2">
                        <div className="w-[350px]">
                          <PeopleSelector
                            organizationRef={data.organization}
                            selectedPersonId={documentValue.owner?.id || ""}
                            onSelect={handleOwnerUpdate}
                            placeholder="Select document owner"
                            required={true}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingOwner(false)}
                          disabled={isUpdatingDocument}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{documentValue.owner?.fullName || "Unknown"}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingOwner(true)}
                        >
                          Change
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Document Type:</span>
                    {isEditingType ? (
                      <div className="flex items-center gap-2">
                        <select
                          className="h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                          value={ documentValue.documentType }
                          onChange={(e) => handleTypeUpdate(e.target.value as DocumentType)}
                        >
                          <option value="POLICY">Policy</option>
                          <option value="ISMS">ISMS</option>
                          <option value="OTHER">Other</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingType(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{ documentValue.documentType === "ISMS" ? "ISMS" : documentValue.documentType === "POLICY" ? "Policy" : "Other" }</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingType(true)}
                        >
                          Change
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Last Modified:</span> {formatDate(latestVersionNode.updatedAt)}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-solid-b shadow-sm p-6">
              {latestVersionNode.changelog && (
                <div className="mb-6 p-4 bg-level-1 rounded-md border border-solid-b">
                  <div className="text-xs text-tertiary uppercase font-medium mb-1">
                    Change summary
                  </div>
                  <div className="text-sm text-secondary">
                    {latestVersionNode.changelog}
                  </div>
                </div>
              )}

              <div className="prose prose-olive max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {latestVersionNode.content || "No content available"}
                </ReactMarkdown>
              </div>

              <div className="mt-8 pt-4 border-t border-solid-b text-xs text-tertiary flex justify-between items-center">
                <div>
                  {latestVersionNode.status === "PUBLISHED"
                    ? `Published on ${formatDate(latestVersionNode.publishedAt || "")}${latestVersionNode.publishedBy ? ` by ${latestVersionNode.publishedBy.fullName}` : ""}`
                    : `Last modified on ${formatDate(latestVersionNode.updatedAt)} by ${documentValue.owner?.fullName || "Unknown"}`}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg border border-solid-b shadow-sm p-6 text-center text-tertiary">
            No content available
          </div>
        )}
      </div>

      {/* Signatures Modal */}
      <SignaturesModal
        isOpen={isSignaturesModalOpen}
        onClose={() => setIsSignaturesModalOpen(false)}
        documentRef={documentValue}
        owner={documentValue.owner}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        documentRef={documentValue}
        onRestoreVersion={handleRestoreVersion}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the document &ldquo;{documentValue.title}&rdquo;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteDocument}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Confirmation Dialog */}
      <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Document</DialogTitle>
            <DialogDescription>
              Please review and edit the changelog before publishing the document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="changelog">Changelog</Label>
            <textarea
              id="changelog"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={publishChangelog}
              onChange={(e) => setPublishChangelog(e.target.value)}
              placeholder="Enter changelog message"
            />
            {isGeneratingChangelog && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>Generating changelog...</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPublishDialogOpen(false)}
              disabled={isPublishInFlight}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={confirmPublish}
              disabled={isPublishInFlight || !publishChangelog.trim()}
            >
              {isPublishInFlight ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}

export default function ShowDocumentView() {
  const [queryRef, loadQuery] =
    useQueryLoader<ShowDocumentViewQuery>(documentViewQuery);
  const { documentId, organizationId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!organizationId || !documentId) {
      toast({
        title: "Error",
        description: "Invalid document or organization ID",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    loadQuery({ documentId, organizationId });
  }, [loadQuery, documentId, organizationId, toast, navigate]);

  if (!organizationId || !documentId) {
    return null;
  }

  if (!queryRef) {
    return <ShowDocumentViewSkeleton />;
  }

  return (
    <Suspense fallback={<ShowDocumentViewSkeleton />}>
      <ShowDocumentContent queryRef={queryRef} />
    </Suspense>
  );
}
