export const modelPages = [
  {
    id: "knn",
    label: "KNN Model",
    path: "/models/knn",
    status: "ready",
    visible: true,
  },
  {
    id: "logistic-regression",
    label: "Logistic Regression",
    path: "/models/logistic-regression",
    status: "ready",
    visible: true,
  },
  {
    id: "decision-tree",
    label: "Decision Tree",
    path: "/models/decision-tree",
    status: "not-ready",
    visible: false,
  },
  {
    id: "neural-network",
    label: "Neural Network",
    path: "/models/neural-network",
    status: "not-ready",
    visible: false,
  },
];

export const completedModelPages = modelPages.filter(
  (model) => model.visible && model.status === "ready"
);