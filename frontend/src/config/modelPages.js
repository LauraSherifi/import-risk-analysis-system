export const modelPages = [
  {
    id: "decision-tree",
    label: "Decision Tree",
    path: "/models/decision-tree",
    status: "ready",
    visible: true,
  },
  {
    id: "neural-network",
    label: "Neural Network",
    path: "/models/neural-network",
    status: "ready",
    visible: true,
  },
  {
    id: "svm",
    label: "SVM Model",
    path: "/models/svm",
    status: "ready",
    visible: true,
  },
];

export const completedModelPages = modelPages.filter((model) => model.visible);
