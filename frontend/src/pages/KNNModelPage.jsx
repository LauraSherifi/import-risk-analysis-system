import ModelDashboardTemplate from "../components/ModelDashboardTemplate";

const cards = [
  {
    label: "Algorithm",
    value: "KNN",
    note: "Completed classifier",
  },
  {
    label: "Accuracy",
    value: "98.58%",
    note: "Model evaluation result",
  },
  {
    label: "Macro F1",
    value: "97.18%",
    note: "Balanced class performance",
  },
  {
    label: "Weighted F1",
    value: "98.57%",
    note: "Weighted by class support",
  },
];

const metrics = [
  { label: "Accuracy", value: 98.58 },
  { label: "Macro F1", value: 97.18 },
  { label: "Weighted F1", value: 98.57 },
];

function KNNModelPage() {
  return (
    <ModelDashboardTemplate
      title="KNN Model Dashboard"
      subtitle="Performance summary for the completed KNN shipment risk classifier."
      status="Completed Model"
      cards={cards}
      metrics={metrics}
      notes="This page uses the completed KNN model results. Future classifier pages can reuse the same template once their algorithms are ready."
    />
  );
}

export default KNNModelPage;