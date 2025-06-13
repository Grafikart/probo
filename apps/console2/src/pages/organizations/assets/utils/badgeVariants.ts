export const getAssetTypeVariant = (type: string) => {
  switch (type) {
    case "PHYSICAL":
      return "warning";
    case "VIRTUAL":
      return "info";
    default:
      return "neutral";
  }
};

export const getCriticityVariant = (criticity: string) => {
  switch (criticity) {
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "neutral";
    default:
      return "neutral";
  }
};
