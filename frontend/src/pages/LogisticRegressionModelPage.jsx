import ModelDashboardTemplate from "../components/ModelDashboardTemplate";

const cards = [
  {
    label: "Algorithm",
    value: "Logistic Regression",
    note: "Completed classifier",
  },
  {
    label: "Accuracy",
    value: "49.92%",
    note: "Below baseline accuracy",
  },
  {
    label: "F1 Score",
    value: "22.88%",
    note: "Weak high-risk classification",
  },
  {
    label: "Baseline Accuracy",
    value: "85.06%",
    note: "Majority-class benchmark",
  },
];

const metrics = [
  { label: "Accuracy", value: 49.92 },
  { label: "Precision", value: 14.86 },
  { label: "Recall", value: 49.75 },
  { label: "F1 Score", value: 22.88 },
];

function LogisticRegressionModelPage() {
  return (
    <ModelDashboardTemplate
      title="Logistic Regression Dashboard"
      subtitle="Performance summary for the completed Logistic Regression shipment risk classifier."
      status="Completed Model"
      cards={cards}
      metrics={metrics}
      notes="Logistic Regression has been trained and evaluated, but its performance is weaker than the baseline. It should be kept as a completed comparison model, while KNN remains the stronger model for the current interface."
    />
  );
}

export default LogisticRegressionModelPage;