const {
  buildDashboardSummary,
  buildDatasetSummary,
  buildKnnModelData,
  buildLogisticRegressionData,
  buildModelComparisonMetrics,
  buildPredictionLabContext,
  buildSvmModelData,
} = require("./dataService");

function getAssistantConfiguration() {
  return {
    configured: true,
    model: "project-assistant",
    mode: "local-project-context",
  };
}

function normalizeRoute(route) {
  const value = String(route || "").trim().toLowerCase();
  return value.startsWith("/") ? value : `/${value}`;
}

function toCompactRiskDistribution(items = []) {
  return items.map((item) => ({
    label: item.label,
    value: item.value,
    percentage: item.percentage,
  }));
}

function buildPageDescriptor(route) {
  switch (normalizeRoute(route)) {
    case "/app/dashboard":
      return {
        pageKey: "dashboard",
        pageLabel: "Dashboard",
        description:
          "Overview of dataset quality, risk distribution, and completed model metrics for Decision Tree, Neural Network, and SVM.",
      };
    case "/app/dataset":
      return {
        pageKey: "dataset",
        pageLabel: "Dataset",
        description:
          "Detailed dataset quality, engineered features, sample rows, and top shipment patterns.",
      };
    case "/app/prediction":
      return {
        pageKey: "prediction",
        pageLabel: "Prediction Lab",
        description:
          "Live prediction form, history, and dataset benchmarks tied to the ML service.",
      };
    case "/app/testing-lab":
      return {
        pageKey: "testing-lab",
        pageLabel: "Mini Testing Lab",
        description:
          "Interactive learning games powered by dataset context and model comparison metrics.",
      };
    case "/app/models/decision-tree":
      return {
        pageKey: "decision-tree",
        pageLabel: "Decision Tree Model",
        description:
          "Decision Tree metrics, feature list, and confusion matrix.",
      };
    case "/app/models/neural-network":
      return {
        pageKey: "neural-network",
        pageLabel: "Neural Network Model",
        description:
          "Neural Network metrics, architecture summary, and confusion matrix.",
      };
    case "/app/models/svm":
      return {
        pageKey: "svm",
        pageLabel: "SVM Model",
        description:
          "Support Vector Machine evaluation metrics, confusion matrix, and feature list.",
      };
    case "/app/risk-map":
      return {
        pageKey: "risk-map",
        pageLabel: "Risk Map",
        description:
          "Static route visualization page using local map data rather than live backend data.",
      };
    default:
      return {
        pageKey: "general",
        pageLabel: "Project Workspace",
        description: "General project assistant context.",
      };
  }
}

function buildPageContext(route, predictionHistory = [], historySummary = null) {
  const page = buildPageDescriptor(route);

  switch (page.pageKey) {
    case "dashboard": {
      const dashboard = buildDashboardSummary();
      return {
        page,
        dataSource: "backend live summary",
        overview: dashboard.overview,
        riskDistribution: toCompactRiskDistribution(dashboard.risk_distribution),
        topPorts: dashboard.top_ports.slice(0, 5),
        topProducts: dashboard.top_products.slice(0, 5),
        completedModels: {
          decisionTreeAccuracy: dashboard.models?.decision_tree?.accuracy ?? null,
          neuralNetworkAccuracy: dashboard.models?.neural_network?.accuracy ?? null,
          svmAccuracy: dashboard.models?.svm?.accuracy ?? null,
        },
      };
    }
    case "dataset": {
      const dataset = buildDatasetSummary();
      return {
        page,
        dataSource: "backend dataset summary",
        totals: {
          totalRecords: dataset.total_records,
          totalColumns: dataset.total_columns,
          missingValues: dataset.missing_values.total,
          duplicateRows: dataset.duplicate_rows,
        },
        numericSummary: dataset.numeric_summary,
        riskDistribution: toCompactRiskDistribution(dataset.risk_distribution),
        topPorts: dataset.top_ports.slice(0, 5),
        topProducts: dataset.top_products.slice(0, 5),
        featureImpact: dataset.feature_impact.slice(0, 5),
      };
    }
    case "prediction": {
      const labContext = buildPredictionLabContext();
      return {
        page,
        dataSource: "backend lab context plus runtime prediction history",
        model: labContext.model,
        totalShipments: labContext.totalShipments,
        taxRatioQuartiles: labContext.taxRatioQuartiles,
        topPorts: labContext.topPorts.slice(0, 5),
        highRiskShare: labContext.highRiskShare,
        recentPredictionsSummary: historySummary,
        recentPredictions: predictionHistory.slice(0, 5).map((item) => ({
          id: item.id,
          risk: item.risk,
          confidence: item.confidence,
          createdAt: item.created_at,
          destinationPort: item.metadata?.destination_port || "",
          productName: item.metadata?.product_name || "",
        })),
      };
    }
    case "testing-lab": {
      const labContext = buildPredictionLabContext();
      return {
        page,
        dataSource: "backend lab context",
        model: labContext.model,
        algorithmMetrics: buildModelComparisonMetrics(),
        sampleCounts: {
          featuredSamples: labContext.featuredSamples.length,
          comparisonSamples: labContext.comparisonSamples.length,
          labSamples: labContext.labSamples.length,
        },
        taxRatioQuartiles: labContext.taxRatioQuartiles,
        topPorts: labContext.topPorts.slice(0, 5),
      };
    }
    case "neural-network":
      return {
        page,
        dataSource: "backend model metrics",
        integrationStatus:
          "This page is connected to backend neural-network metrics and shows the saved evaluation results.",
      };
    case "svm": {
      const svm = buildSvmModelData();
      return {
        page,
        dataSource: "backend model metrics",
        model: svm.metrics
          ? {
              accuracy: svm.metrics.accuracy,
              precision: svm.metrics.precision,
              recall: svm.metrics.recall,
              f1Score: svm.metrics.f1_score,
              baselineAccuracy: svm.metrics.baseline_accuracy,
              validationPrecision: svm.metrics.validation_precision,
              validationRecall: svm.metrics.validation_recall,
              validationF1: svm.metrics.validation_f1,
              featuresUsed: svm.features_used,
            }
          : null,
      };
    }
    case "risk-map":
      return {
        page,
        dataSource: "page-only status",
        integrationStatus:
          "This page is currently static and uses local map data rather than a backend route.",
      };
    default: {
      const dataset = buildDatasetSummary();
      return {
        page,
        dataSource: "general project summary",
        projectSummary: {
          totalRecords: dataset.total_records,
          highRiskShare:
            dataset.risk_distribution.find((item) => item.label === "HIGH RISK")
              ?.percentage ?? 0,
          connectedPages: [
            "Dashboard",
            "Dataset",
            "Prediction Lab",
            "Mini Testing Lab",
            "Decision Tree Model",
            "Neural Network Model",
            "SVM Model",
          ],
          staticPages: ["Risk Map"],
        },
      };
    }
  }
}

function isProjectQuestion(question, pageContext) {
  const normalizedQuestion = String(question || "").toLowerCase();
  const pageWords = `${pageContext.page.pageLabel} ${pageContext.page.description}`.toLowerCase();
  const projectTerms = [
    "import",
    "risk",
    "analysis",
    "system",
    "project",
    "page",
    "dataset",
    "model",
    "prediction",
    "testing",
    "lab",
    "dashboard",
    "port",
    "shipment",
    "tax",
    "ratio",
    "fraud",
    "decision",
    "tree",
    "neural",
    "svm",
    "backend",
    "frontend",
    "algorithm",
  ];

  if (
    normalizedQuestion.includes("this page") ||
    normalizedQuestion.includes("our project") ||
    normalizedQuestion.includes("the project")
  ) {
    return true;
  }

  return projectTerms.some(
    (term) =>
      normalizedQuestion.includes(term) || pageWords.includes(term) && normalizedQuestion.includes(term)
  );
}

function formatAccuracy(value) {
  if (!Number.isFinite(Number(value))) {
    return "not available";
  }

  const percentage = Number(value) <= 1 ? Number(value) * 100 : Number(value);
  return `${percentage.toFixed(2)}%`;
}

function formatSummaryLines(lines) {
  return lines.filter(Boolean).join(" ");
}

function buildPresentationReply(pageContext) {
  switch (pageContext.page.pageKey) {
    case "dashboard":
      return formatSummaryLines([
        "You can present this as the high-level control room of the Import Risk Analysis System.",
        `It summarizes ${pageContext.overview.total_records.toLocaleString()} cleaned shipment records, shows the risk split, and compares the completed Decision Tree, Neural Network, and SVM models.`,
        "The main message is that the dashboard combines data quality, shipment patterns, and model performance in one place.",
      ]);
    case "dataset":
      return formatSummaryLines([
        "You can present this page as the data foundation of the project.",
        `It shows ${pageContext.totals.totalRecords.toLocaleString()} records across ${pageContext.totals.totalColumns} columns, plus missing values, duplicates, top ports, and engineered features.`,
        "The message is that the dataset was cleaned and prepared for reliable model training and analysis.",
      ]);
    case "prediction":
      return formatSummaryLines([
        "You can present this page as the live decision screen of the project.",
        `It uses the active ${pageContext.model?.name || "SVM"} model, compares user input against dataset benchmarks, and shows recent prediction behavior.`,
        "The message is that users can test shipment cases and immediately see how the project interprets customs risk.",
      ]);
    case "testing-lab":
      return formatSummaryLines([
        "You can present this page as the interactive learning part of the system.",
        "It turns dataset and model behavior into small exercises so the user can understand what drives risk decisions.",
        "The message is that the project does not only predict risk, it also explains the logic in a more engaging way.",
      ]);
    default:
      return `You can present the ${pageContext.page.pageLabel} page as ${pageContext.page.description.toLowerCase()}`;
  }
}

function buildIntegrationReply(pageContext) {
  if (pageContext.page.pageKey === "risk-map" || pageContext.page.pageKey === "neural-network") {
    return pageContext.integrationStatus;
  }

  return `The ${pageContext.page.pageLabel} page is connected to the project backend and uses ${pageContext.dataSource}.`;
}

function buildPageAnswer(pageContext) {
  switch (pageContext.page.pageKey) {
    case "dashboard":
      return formatSummaryLines([
        `This page is the project dashboard. It summarizes ${pageContext.overview.total_records.toLocaleString()} shipment records and shows a high-risk share of ${pageContext.overview.high_risk_share}%.`,
        `The strongest completed models shown here are Decision Tree at ${formatAccuracy(pageContext.completedModels.decisionTreeAccuracy)}, Neural Network at ${formatAccuracy(pageContext.completedModels.neuralNetworkAccuracy)}, and SVM at ${formatAccuracy(pageContext.completedModels.svmAccuracy)}.`,
        pageContext.topPorts[0]
          ? `${pageContext.topPorts[0].port} is currently the top destination port in the visible summary.`
          : "",
      ]);
    case "dataset":
      return formatSummaryLines([
        `This page explains the cleaned project dataset. It contains ${pageContext.totals.totalRecords.toLocaleString()} records and ${pageContext.totals.totalColumns} columns.`,
        `The current summary shows ${pageContext.totals.missingValues} missing values and ${pageContext.totals.duplicateRows} duplicate rows.`,
        pageContext.featureImpact[0]
          ? `${String(pageContext.featureImpact[0].feature).replaceAll("_", " ")} is one of the strongest visible feature-impact signals in the dataset summary.`
          : "",
      ]);
    case "prediction":
      return formatSummaryLines([
        `This page is the live prediction lab. It uses the ${pageContext.model?.name || "saved"} model and compares new shipment inputs against ${pageContext.totalShipments.toLocaleString()} processed shipments.`,
        `The visible tax-ratio guide uses lower, median, and upper reference points of ${pageContext.taxRatioQuartiles.low}, ${pageContext.taxRatioQuartiles.median}, and ${pageContext.taxRatioQuartiles.high}.`,
        pageContext.recentPredictionsSummary
          ? `The current session has ${pageContext.recentPredictionsSummary.total_predictions} saved predictions in backend memory.`
          : "",
      ]);
    case "testing-lab":
      return formatSummaryLines([
        "This page is the Mini Testing Lab.",
        `It uses ${pageContext.sampleCounts.labSamples} lab samples, ${pageContext.sampleCounts.featuredSamples} featured examples, and model comparison metrics from the backend.`,
        `The lab is centered on understanding how features like tax ratio influence the project's risk logic.`
      ]);
    case "decision-tree":
      return pageContext.model
        ? `This page explains the Decision Tree model. The current summary shows accuracy of ${formatAccuracy(pageContext.model.accuracy)}, F1 score of ${formatAccuracy(pageContext.model.f1Score)}, and the most important feature signals.`
        : "This page is intended to show Decision Tree metrics, but no metrics are currently available.";
    case "risk-map":
    case "neural-network":
    case "svm":
      return pageContext.integrationStatus;
    default:
      return `This assistant can answer questions about the Import Risk Analysis System project. Right now you are on the ${pageContext.page.pageLabel} page.`;
  }
}

function buildProjectSummary(pageContext) {
  if (pageContext.projectSummary) {
    return formatSummaryLines([
      `The Import Risk Analysis System currently centers on ${pageContext.projectSummary.totalRecords.toLocaleString()} cleaned shipment records.`,
      `Connected pages include ${pageContext.projectSummary.connectedPages.join(", ")}.`,
      `Pages still static or not fully integrated include ${pageContext.projectSummary.staticPages.join(", ")}.`,
    ]);
  }

  return buildPageAnswer(pageContext);
}

async function generateAssistantReply({
  route,
  question,
  predictionHistory = [],
  historySummary = null,
}) {
  const safeQuestion = String(question || "").trim();
  if (!safeQuestion) {
    const error = new Error("Question is required.");
    error.statusCode = 400;
    throw error;
  }

  const pageContext = buildPageContext(route, predictionHistory, historySummary);

  if (!isProjectQuestion(safeQuestion, pageContext)) {
    return {
      answer:
        "I can only answer questions about the Import Risk Analysis System project, its pages, dataset, models, and prediction flow.",
      page: pageContext.page,
      model: "project-assistant",
    };
  }

  const normalizedQuestion = safeQuestion.toLowerCase();
  let answer = "";

  if (
    normalizedQuestion.includes("present") ||
    normalizedQuestion.includes("presentation") ||
    normalizedQuestion.includes("explain this page")
  ) {
    answer = buildPresentationReply(pageContext);
  } else if (
    normalizedQuestion.includes("backend") ||
    normalizedQuestion.includes("connected") ||
    normalizedQuestion.includes("live") ||
    normalizedQuestion.includes("static")
  ) {
    answer = buildIntegrationReply(pageContext);
  } else if (
    normalizedQuestion.includes("project") ||
    normalizedQuestion.includes("system")
  ) {
    answer = buildProjectSummary(pageContext);
  } else {
    answer = buildPageAnswer(pageContext);
  }

  return {
    answer,
    page: pageContext.page,
    model: "project-assistant",
  };
}

module.exports = {
  buildPageContext,
  buildPageDescriptor,
  generateAssistantReply,
  getAssistantConfiguration,
};
