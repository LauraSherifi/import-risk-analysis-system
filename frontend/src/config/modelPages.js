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
  status: "ready",
  visible: true,
},
  {
  id: "random-forest",
  label: "Random Forest",
  path: "/models/random-forest",
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
];

export const completedModelPages = modelPages.filter((model) => model.visible);