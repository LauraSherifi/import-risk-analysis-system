import { useEffect, useMemo, useState } from "react";
import { predictionLabDataset } from "../data/predictionLabData";

const shipmentSignals = [
  ...predictionLabDataset.featuredSamples,
  ...predictionLabDataset.comparisonSamples,
];

const datasetGameSamples = predictionLabDataset.labSamples;

const algorithmMetrics = [
  {
    id: "accuracy",
    title: "Accuracy",
    knn: 98.58,
    logistic: 49.92,
    description:
      "KNN correctly classifies almost all held-out shipments, while Logistic Regression lands close to a coin-flip result on this dataset.",
    recommendation:
      "This is why the live prediction experience is better aligned with KNN in the current project.",
  },
  {
    id: "f1",
    title: "F1 Score",
    knn: 97.18,
    logistic: 22.88,
    description:
      "The balanced quality score is dramatically stronger for KNN, especially important when high-risk cases matter most.",
    recommendation:
      "KNN keeps both precision and recall in a usable range, while Logistic Regression loses too much balance.",
  },
  {
    id: "precision",
    title: "Precision",
    knn: 95.66,
    logistic: 14.86,
    description:
      "When Logistic Regression predicts HIGH RISK, it is wrong far more often than KNN on the saved evaluation artifacts.",
    recommendation:
      "KNN is much more trustworthy when flagging suspicious shipments.",
  },
  {
    id: "recall",
    title: "Recall",
    knn: 94.75,
    logistic: 49.75,
    description:
      "KNN catches almost all real high-risk shipments in the test split, while Logistic Regression only recovers about half of them.",
    recommendation:
      "If the goal is to surface suspicious imports reliably, KNN stays far ahead.",
  },
];

const gamePlaceholders = [
  {
    id: "tax-ratio-slider",
    eyebrow: "Tax Ratio Slider",
    title: "Adjust the tax ratio and watch the risk shift.",
    detail: "Interactive AI learning lab ready to open.",
    accentClass: "lab-placeholder-blue",
    cta: "Play",
    previewType: "slider",
  },
  {
    id: "risk-puzzle",
    eyebrow: "Risk Puzzle",
    title: "Arrange the dataset factors from least to most risky.",
    detail: "Feature-importance ranking lab ready to open.",
    accentClass: "lab-placeholder-green",
    cta: "Play",
    previewType: "puzzle",
  },
  {
    id: "spot-risky-shipment",
    eyebrow: "Spot the Risky Shipment",
    title: "Compare two shipments and pick the suspicious one.",
    detail: "Customs intelligence simulator ready to open.",
    accentClass: "lab-placeholder-amber",
    cta: "Play",
    previewType: "versus",
  },
  {
    id: "beat-the-model",
    eyebrow: "Beat the Model",
    title: "Try to outperform the saved model on risky cases.",
    detail: "Customs training challenge ready to open.",
    accentClass: "lab-placeholder-violet",
    cta: "Play",
    previewType: "score",
  },
];

const riskPuzzleFeatures = [
  {
    id: "destination-port",
    label: "Destination Port",
    shortLabel: "Port",
    importance: 1,
    explanation:
      "Destination port adds route context from the real dataset, but it is still weaker than the core numeric declaration signals.",
  },
  {
    id: "declared-tax",
    label: "Declared Tax",
    shortLabel: "Tax",
    importance: 2,
    explanation:
      "Declared tax matters on its own, but the model reads it most strongly when it is compared against invoice value through tax_ratio.",
  },
  {
    id: "shipment-weight",
    label: "Shipment Weight",
    shortLabel: "Weight",
    importance: 3,
    explanation:
      "Weight helps compare the shipment with dataset averages and can support suspicion when the shipment looks unusual for its declared value.",
  },
  {
    id: "invoice-value",
    label: "Invoice Value",
    shortLabel: "Value",
    importance: 4,
    explanation:
      "Invoice value sets the economic context of the shipment and heavily changes how suspicious the declared tax appears.",
  },
  {
    id: "tax-ratio",
    label: "Tax Ratio",
    shortLabel: "Tax Ratio",
    importance: 5,
    explanation:
      "Tax Ratio is the strongest factor because the live model on this page is built around tax and tax_ratio behavior.",
  },
];

const puzzleDifficulties = {
  easy: {
    label: "Easy",
    time: 90,
    hint:
      "Start by placing Tax Ratio at the far right. It is the strongest risk signal in the live prediction flow.",
  },
  medium: {
    label: "Medium",
    time: 60,
    hint:
      "Think in terms of model influence: context factors first, then supporting numeric features, then the core tax behavior signal.",
  },
  hard: {
    label: "Hard",
    time: 40,
    hint:
      "Focus on what the model truly depends on, not just what sounds important in logistics.",
  },
};

const createPuzzleOrder = () =>
  [...riskPuzzleFeatures]
    .sort(() => Math.random() - 0.5)
    .map((feature) => feature.id);

const shipmentSpotDifficulties = {
  easy: { label: "Easy", time: 30, cards: 2 },
  medium: { label: "Medium", time: 24, cards: 3 },
  hard: { label: "Hard", time: 18, cards: 4 },
};

const getPortActivityWeight = (destinationPort) => {
  const topPort = predictionLabDataset.topPorts.find(
    (port) => port.name === destinationPort
  );
  if (!topPort) {
    return 18;
  }

  return Math.round(
    (topPort.shipmentCount / predictionLabDataset.topPorts[0].shipmentCount) * 42
  );
};

const buildDatasetAssessment = (sample) => {
  const { low, median, high } = predictionLabDataset.taxRatioQuartiles;
  const ratio = Number(sample.taxRatio);
  const price = Number(sample.priceUsd);
  const weight = Number(sample.weightKg);
  const taxUsd = Number(sample.taxUsd);

  let fraudProbability = 24;
  if (ratio <= low) {
    fraudProbability = 82 + Math.min(15, Math.round(((low - ratio) / low) * 18));
  } else if (ratio < median) {
    fraudProbability =
      46 + Math.round(((median - ratio) / (median - low || 1)) * 18);
  } else if (ratio < high) {
    fraudProbability =
      26 + Math.round(((high - ratio) / (high - median || 1)) * 14);
  } else {
    fraudProbability = Math.max(
      8,
      22 - Math.round(((ratio - high) / high) * 12)
    );
  }

  if (price >= predictionLabDataset.averagePriceUsd) {
    fraudProbability += 6;
  }
  if (weight >= predictionLabDataset.averageWeightKg) {
    fraudProbability += 4;
  }
  if (taxUsd >= predictionLabDataset.averageTaxUsd && ratio > low) {
    fraudProbability -= 4;
  }

  fraudProbability = Math.max(6, Math.min(97, fraudProbability));

  const importance = {
    "Tax Ratio": Math.max(22, Math.min(99, fraudProbability + 4)),
    "Invoice Value": Math.max(
      16,
      Math.min(82, Math.round((price / predictionLabDataset.averagePriceUsd) * 42 + 28))
    ),
    "Shipment Weight": Math.max(
      14,
      Math.min(76, Math.round((weight / predictionLabDataset.averageWeightKg) * 24 + 24))
    ),
    "Declared Tax": Math.max(
      12,
      Math.min(74, Math.round((taxUsd / predictionLabDataset.averageTaxUsd) * 28 + 20))
    ),
    "Destination Port": getPortActivityWeight(sample.destinationPort),
  };

  const strongestFactors = [];
  if (ratio <= low) {
    strongestFactors.push("Very low tax ratio");
  } else if (ratio < median) {
    strongestFactors.push("Below-median tax ratio");
  } else {
    strongestFactors.push("Stronger declared tax ratio");
  }

  strongestFactors.push(
    price >= predictionLabDataset.averagePriceUsd
      ? "Invoice value above dataset average"
      : "Invoice value below dataset average"
  );
  strongestFactors.push(
    weight >= predictionLabDataset.averageWeightKg
      ? "Heavy shipment profile"
      : "Light shipment profile"
  );

  let explanation =
    "This shipment sits in the safer part of the dataset because the declared tax remains consistent with the invoice value.";
  if (ratio <= low) {
    explanation =
      "Very low tax ratio compared to invoice value increased fraud suspicion, which is the strongest signal visible in the project dataset.";
  } else if (ratio < median) {
    explanation =
      "The shipment falls below the dataset median tax ratio, so it stays in a watch zone where under-declaration becomes more plausible.";
  }

  const aiPrediction = fraudProbability >= 55 ? "HIGH RISK" : "LOW RISK";

  return {
    fraudProbability,
    strongestFactors,
    importance,
    explanation,
    aiPrediction,
    correctAnswer: sample.risk,
  };
};

const buildShipmentSpotRound = (difficulty) => {
  const cardCount = shipmentSpotDifficulties[difficulty].cards;
  const shuffled = [...datasetGameSamples].sort(() => Math.random() - 0.5);
  let selected = shuffled.slice(0, cardCount);

  if (!selected.some((item) => item.risk === "HIGH RISK")) {
    selected[0] = datasetGameSamples.find((item) => item.risk === "HIGH RISK");
  }

  selected = selected.map((sample) => ({
    ...sample,
    ...buildDatasetAssessment(sample),
  }));

  const highestRisk = [...selected].sort(
    (left, right) => right.fraudProbability - left.fraudProbability
  )[0];

  return {
    shipments: selected,
    answerId: highestRisk.id,
  };
};

const beatModelDifficulties = {
  easy: { label: "Easy" },
  medium: { label: "Medium" },
  hard: { label: "Hard" },
};

const buildBeatModelRound = (difficulty) => {
  const { low, high } = predictionLabDataset.taxRatioQuartiles;
  const pools = {
    easy: datasetGameSamples.filter(
      (sample) => sample.taxRatio <= low * 0.95 || sample.taxRatio >= high
    ),
    medium: datasetGameSamples,
    hard: datasetGameSamples.filter(
      (sample) => sample.taxRatio > low * 0.9 && sample.taxRatio < high
    ),
  };
  const candidates = pools[difficulty]?.length
    ? pools[difficulty]
    : datasetGameSamples;
  const sample = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    ...sample,
    ...buildDatasetAssessment(sample),
  };
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

function MiniTestingLabPage() {
  const [selectedShipmentId, setSelectedShipmentId] = useState(
    shipmentSignals[0].id
  );
  const [selectedMetricId, setSelectedMetricId] = useState(
    algorithmMetrics[0].id
  );
  const [isTaxRatioLabOpen, setIsTaxRatioLabOpen] = useState(false);
  const [taxRatioSliderValue, setTaxRatioSliderValue] = useState(
    Math.round(shipmentSignals[0].taxRatio * 1000) / 10
  );
  const [isRiskPuzzleOpen, setIsRiskPuzzleOpen] = useState(false);
  const [puzzleDifficulty, setPuzzleDifficulty] = useState("medium");
  const [puzzleAvailableOrder, setPuzzleAvailableOrder] = useState(
    createPuzzleOrder()
  );
  const [puzzleRanking, setPuzzleRanking] = useState(Array(5).fill(null));
  const [puzzleDraggedId, setPuzzleDraggedId] = useState(null);
  const [puzzleTimeLeft, setPuzzleTimeLeft] = useState(
    puzzleDifficulties.medium.time
  );
  const [puzzleSubmitted, setPuzzleSubmitted] = useState(false);
  const [puzzleShowHint, setPuzzleShowHint] = useState(false);
  const [isShipmentSpotOpen, setIsShipmentSpotOpen] = useState(false);
  const [shipmentSpotDifficulty, setShipmentSpotDifficulty] = useState("medium");
  const [shipmentSpotRound, setShipmentSpotRound] = useState(() =>
    buildShipmentSpotRound("medium")
  );
  const [shipmentSpotTimeLeft, setShipmentSpotTimeLeft] = useState(
    shipmentSpotDifficulties.medium.time
  );
  const [shipmentSpotSelection, setShipmentSpotSelection] = useState(null);
  const [shipmentSpotRevealed, setShipmentSpotRevealed] = useState(false);
  const [shipmentSpotScore, setShipmentSpotScore] = useState(0);
  const [shipmentSpotStreak, setShipmentSpotStreak] = useState(0);
  const [isBeatModelOpen, setIsBeatModelOpen] = useState(false);
  const [beatModelDifficulty, setBeatModelDifficulty] = useState("medium");
  const [beatModelRound, setBeatModelRound] = useState(() =>
    buildBeatModelRound("medium")
  );
  const [beatModelChoice, setBeatModelChoice] = useState(null);
  const [beatModelConfidence, setBeatModelConfidence] = useState(70);
  const [beatModelScanning, setBeatModelScanning] = useState(false);
  const [beatModelRevealed, setBeatModelRevealed] = useState(false);
  const [beatModelHumanScore, setBeatModelHumanScore] = useState(0);
  const [beatModelAiScore, setBeatModelAiScore] = useState(0);
  const [beatModelStreak, setBeatModelStreak] = useState(0);

  const selectedShipment =
    shipmentSignals.find((item) => item.id === selectedShipmentId) ||
    shipmentSignals[0];
  const selectedMetric =
    algorithmMetrics.find((item) => item.id === selectedMetricId) ||
    algorithmMetrics[0];

  const shipmentSignal = useMemo(() => {
    const ratio = Number(selectedShipment?.taxRatio || 0);
    const { low, median, high } = predictionLabDataset.taxRatioQuartiles;
    const riskBand =
      ratio <= low ? "alert" : ratio >= high ? "safe" : "steady";

    let intensity = 100;
    if (ratio >= high) {
      intensity = 18;
    } else if (ratio > low) {
      const progress = (ratio - low) / (high - low);
      intensity = Math.round(82 - progress * 48);
    }

    return {
      ratio,
      median,
      riskBand,
      intensity: Math.max(18, Math.min(100, intensity)),
      riskLevel:
        riskBand === "alert"
          ? "High risk signal"
          : riskBand === "safe"
            ? "Low risk signal"
            : "Watch zone",
    };
  }, [selectedShipment]);

  const runnerPosition = useMemo(() => {
    const minRatio = predictionLabDataset.taxRatioQuartiles.low * 0.55;
    const maxRatio = predictionLabDataset.taxRatioQuartiles.high * 1.2;
    const normalized =
      (shipmentSignal.ratio - minRatio) / (maxRatio - minRatio);

    return Math.max(12, Math.min(88, Math.round(12 + normalized * 76)));
  }, [shipmentSignal.ratio]);

  const runnerState = shipmentSignal.riskBand;
  const runnerMessage =
    runnerState === "alert"
      ? "This sample falls into the low tax-ratio zone, so the runner correctly stays in the high-risk lane."
      : runnerState === "safe"
        ? "This sample has a stronger tax ratio, so the runner correctly moves into the safer lane."
        : "This sample sits between the lower and upper dataset bands, so the runner stays in the watch lane.";
  useEffect(() => {
    if (!isRiskPuzzleOpen || puzzleSubmitted) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setPuzzleTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setPuzzleSubmitted(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRiskPuzzleOpen, puzzleSubmitted]);

  useEffect(() => {
    if (!isShipmentSpotOpen || shipmentSpotRevealed) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setShipmentSpotTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setShipmentSpotRevealed(true);
          setShipmentSpotStreak(0);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isShipmentSpotOpen, shipmentSpotRevealed]);

  useEffect(() => {
    if (!beatModelScanning) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setBeatModelScanning(false);
      setBeatModelRevealed(true);

      const humanCorrect = beatModelChoice === beatModelRound.correctAnswer;
      const aiCorrect = beatModelRound.aiPrediction === beatModelRound.correctAnswer;

      if (humanCorrect) {
        setBeatModelHumanScore((current) => current + 100 + beatModelStreak * 10);
        setBeatModelStreak((current) => current + 1);
      } else {
        setBeatModelStreak(0);
      }

      if (aiCorrect) {
        setBeatModelAiScore((current) => current + 100);
      }
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [beatModelChoice, beatModelRound, beatModelScanning, beatModelStreak]);

  const taxRatioLab = useMemo(() => {
    const ratio = taxRatioSliderValue / 100;
    const lowThreshold = predictionLabDataset.taxRatioQuartiles.low * 100;
    const highThreshold = predictionLabDataset.taxRatioQuartiles.high * 100;
    const medianThreshold = predictionLabDataset.taxRatioQuartiles.median * 100;
    const ratioProgress = Math.max(0, Math.min(1, taxRatioSliderValue / 20));

    let status = "LOW RISK";
    let themeClass = "tax-ratio-lab-safe";

    if (taxRatioSliderValue <= lowThreshold) {
      status = "HIGH RISK";
      themeClass = "tax-ratio-lab-alert";
    } else if (taxRatioSliderValue < highThreshold) {
      status = "MEDIUM RISK";
      themeClass = "tax-ratio-lab-watch";
    }

    const riskScore = Math.max(
      6,
      Math.min(98, Math.round(96 - ratioProgress * 88))
    );
    const fraudProbability = Math.max(
      4,
      Math.min(97, Math.round(94 - ratioProgress * 86))
    );

    let explanation =
      "The model sees a stronger declared tax relationship, so the shipment looks more consistent with low-risk behavior.";

    if (status === "HIGH RISK") {
      explanation =
        "The tax ratio is very low, which is one of the clearest fraud signals in this project. The model increases suspicion because declared tax looks too small for the shipment value.";
    } else if (status === "MEDIUM RISK") {
      explanation =
        "The tax ratio is inside the middle band, so the shipment becomes borderline. The model starts watching for under-declaration patterns but does not treat the shipment as fully dangerous yet.";
    }

    return {
      ratio,
      riskScore,
      fraudProbability,
      status,
      themeClass,
      explanation,
      lowThreshold,
      highThreshold,
      medianThreshold,
    };
  }, [taxRatioSliderValue]);

  const handleOpenTaxRatioLab = () => {
    setTaxRatioSliderValue(Math.round(selectedShipment.taxRatio * 1000) / 10);
    setIsTaxRatioLabOpen(true);
  };

  const resetRiskPuzzle = (difficulty = puzzleDifficulty) => {
    setPuzzleDifficulty(difficulty);
    setPuzzleAvailableOrder(createPuzzleOrder());
    setPuzzleRanking(Array(5).fill(null));
    setPuzzleDraggedId(null);
    setPuzzleSubmitted(false);
    setPuzzleShowHint(false);
    setPuzzleTimeLeft(puzzleDifficulties[difficulty].time);
  };

  const handleOpenRiskPuzzle = () => {
    resetRiskPuzzle(puzzleDifficulty);
    setIsRiskPuzzleOpen(true);
  };

  const startShipmentSpotRound = (difficulty = shipmentSpotDifficulty) => {
    setShipmentSpotDifficulty(difficulty);
    setShipmentSpotRound(buildShipmentSpotRound(difficulty));
    setShipmentSpotTimeLeft(shipmentSpotDifficulties[difficulty].time);
    setShipmentSpotSelection(null);
    setShipmentSpotRevealed(false);
  };

  const handleOpenShipmentSpot = () => {
    startShipmentSpotRound(shipmentSpotDifficulty);
    setIsShipmentSpotOpen(true);
  };

  const startBeatModelRound = (difficulty = beatModelDifficulty) => {
    setBeatModelDifficulty(difficulty);
    setBeatModelRound(buildBeatModelRound(difficulty));
    setBeatModelChoice(null);
    setBeatModelConfidence(70);
    setBeatModelScanning(false);
    setBeatModelRevealed(false);
  };

  const handleOpenBeatModel = () => {
    startBeatModelRound(beatModelDifficulty);
    setIsBeatModelOpen(true);
  };

  const movePuzzleCardToSlot = (featureId, slotIndex) => {
    if (!featureId || puzzleSubmitted) {
      return;
    }

    const nextRanking = [...puzzleRanking].filter((item) => item !== featureId);
    while (nextRanking.length < puzzleRanking.length) {
      nextRanking.push(null);
    }

    const displacedId = nextRanking[slotIndex];
    nextRanking.splice(slotIndex, 1);
    nextRanking.splice(slotIndex, 0, featureId);

    const compactRanking = nextRanking.filter(Boolean);
    while (compactRanking.length < puzzleRanking.length) {
      compactRanking.push(null);
    }

    setPuzzleRanking(compactRanking);
    setPuzzleAvailableOrder((current) => {
      const nextAvailable = current.filter((item) => item !== featureId);
      if (displacedId && !nextAvailable.includes(displacedId)) {
        nextAvailable.push(displacedId);
      }
      return nextAvailable;
    });
  };

  const removePuzzleCardFromSlot = (featureId) => {
    if (!featureId || puzzleSubmitted) {
      return;
    }

    setPuzzleRanking((current) => {
      const compact = current.filter((item) => item && item !== featureId);
      while (compact.length < current.length) {
        compact.push(null);
      }
      return compact;
    });

    setPuzzleAvailableOrder((current) =>
      current.includes(featureId) ? current : [...current, featureId]
    );
  };

  const puzzleFilledCount = useMemo(
    () => puzzleRanking.filter(Boolean).length,
    [puzzleRanking]
  );

  const puzzleScore = useMemo(() => {
    let correct = 0;
    puzzleRanking.forEach((featureId, index) => {
      const feature = riskPuzzleFeatures.find((item) => item.id === featureId);
      if (feature && feature.importance === index + 1) {
        correct += 1;
      }
    });

    return Math.round((correct / riskPuzzleFeatures.length) * 100);
  }, [puzzleRanking]);

  const puzzleCorrectOrder = useMemo(
    () =>
      [...riskPuzzleFeatures]
        .sort((left, right) => left.importance - right.importance)
        .map((feature) => feature.id),
    []
  );

  const puzzleStrongestFactor = riskPuzzleFeatures.find(
    (feature) => feature.importance === 5
  );

  const puzzleExplanation = useMemo(() => {
    if (!puzzleSubmitted) {
      return "";
    }

    if (puzzleScore === 100) {
      return "Perfect ranking. You matched the model-learning story of this page: contextual features come first, numeric shipment signals rise in importance, and tax_ratio dominates the final risk judgment.";
    }

    if (puzzleScore >= 60) {
      return "Strong attempt. You identified several useful supporting signals, but the biggest lesson is that tax_ratio should end up at the far right as the most influential feature in this learning lab.";
    }

    return "This result shows why feature importance matters. Some shipment details help with context, but the current project logic puts the greatest emphasis on tax_ratio, then invoice value and weight as supporting numeric signals.";
  }, [puzzleScore, puzzleSubmitted]);

  const shipmentSpotAnswer = useMemo(
    () =>
      shipmentSpotRound.shipments.find(
        (shipment) => shipment.id === shipmentSpotRound.answerId
      ) || shipmentSpotRound.shipments[0],
    [shipmentSpotRound]
  );

  const shipmentSpotWasCorrect =
    shipmentSpotSelection != null && shipmentSpotSelection === shipmentSpotRound.answerId;

  const handleShipmentSpotSubmit = (shipmentId) => {
    if (shipmentSpotRevealed) {
      return;
    }

    setShipmentSpotSelection(shipmentId);
    setShipmentSpotRevealed(true);

    if (shipmentId === shipmentSpotRound.answerId) {
      setShipmentSpotScore((current) => current + 100 + shipmentSpotStreak * 10);
      setShipmentSpotStreak((current) => current + 1);
    } else {
      setShipmentSpotStreak(0);
    }
  };

  const beatModelHumanCorrect =
    beatModelChoice != null && beatModelChoice === beatModelRound.correctAnswer;
  const beatModelAiCorrect =
    beatModelRound.aiPrediction === beatModelRound.correctAnswer;

  const handleBeatModelChoice = (choice) => {
    if (beatModelScanning || beatModelRevealed) {
      return;
    }

    setBeatModelChoice(choice);
    setBeatModelScanning(true);
  };

  const renderPlaceholderPreview = (previewType) => {
    if (previewType === "slider") {
      return (
        <div
          className="lab-placeholder-preview lab-placeholder-preview-slider"
          aria-hidden="true"
        >
          <div className="lab-preview-topline">
            <span>Tax Ratio:</span>
            <strong>10.0%</strong>
          </div>
          <div className="lab-preview-slider-track">
            <i />
          </div>
          <div className="lab-preview-scale">
            <span>0%</span>
            <span>20%</span>
          </div>
          <div className="lab-preview-summary">
            <em>High Risk</em>
            <strong>87/100</strong>
          </div>
        </div>
      );
    }

    if (previewType === "puzzle") {
      return (
        <div
          className="lab-placeholder-preview lab-placeholder-preview-puzzle"
          aria-hidden="true"
        >
          <span className="lab-preview-chip">Tax Ratio</span>
          <span className="lab-preview-chip">Invoice Value</span>
          <span className="lab-preview-chip">Declared Tax</span>
          <span className="lab-preview-chip">Port</span>
          <span className="lab-preview-chip">Weight</span>
        </div>
      );
    }

    if (previewType === "versus") {
      return (
        <div
          className="lab-placeholder-preview lab-placeholder-preview-versus"
          aria-hidden="true"
        >
          <div className="lab-preview-versus-card">
            <strong>A</strong>
            <span>8.5%</span>
            <em>LOW</em>
          </div>
          <div className="lab-preview-versus-card">
            <strong>B</strong>
            <span>0.8%</span>
            <em>?</em>
          </div>
        </div>
      );
    }

    return (
      <div
        className="lab-placeholder-preview lab-placeholder-preview-score"
        aria-hidden="true"
      >
        <div className="lab-preview-score-grid">
          <div>
            <span>Score</span>
            <strong>650</strong>
          </div>
          <div>
            <span>Level</span>
            <strong>3</strong>
          </div>
          <div>
            <span>Accuracy</span>
            <strong>80%</strong>
          </div>
        </div>
        <div className="lab-preview-streak">
          <span>Streak</span>
          <strong>Hot x3</strong>
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Mini Testing Lab</h1>
          <p>
            Interactive checks built from the real shipment dataset, saved KNN
            metrics, and Logistic Regression evaluation artifacts in this
            project.
          </p>
        </div>
        <div className="status-pill">Dataset-Based Lab</div>
      </header>

      <section className="lab-grid">
        <article className="panel lab-panel">
          <div className="panel-header">
            <div>
              <h3>Tax Ratio Pulse</h3>
              <p>
                Switch between real shipment samples from the processed dataset
                and watch the risk signal react to the actual tax-ratio bands.
              </p>
            </div>
          </div>

          <div className="lab-toggle-grid">
            {shipmentSignals.slice(0, 6).map((shipment) => (
              <button
                key={shipment.id}
                type="button"
                className={`lab-toggle-card ${
                  shipment.id === selectedShipmentId ? "lab-toggle-card-active" : ""
                }`}
                onClick={() => setSelectedShipmentId(shipment.id)}
              >
                <strong>{shipment.productName}</strong>
                <span>{shipment.destinationPort}</span>
              </button>
            ))}
          </div>

          <div className="lab-signal-card">
            <div>
              <span>Invoice value</span>
              <strong>{formatCurrency(selectedShipment.priceUsd)}</strong>
            </div>
            <div>
              <span>Declared tax</span>
              <strong>{formatCurrency(selectedShipment.taxUsd)}</strong>
            </div>
            <div>
              <span>Tax ratio</span>
              <strong>{shipmentSignal.ratio.toFixed(4)}</strong>
            </div>
          </div>

          <div className="lab-meter">
            <div className="lab-meter-header">
              <span>Dataset reading</span>
              <strong>{shipmentSignal.riskLevel}</strong>
            </div>
            <div className="lab-meter-track">
              <div
                className="lab-meter-fill"
                style={{ width: `${shipmentSignal.intensity}%` }}
              />
            </div>
          </div>

          <p className="lab-support-copy">
            Saved dataset label: <strong>{selectedShipment.risk}</strong>. The
            dataset median is {shipmentSignal.median.toFixed(4)}, with the lower
            risk trigger at{" "}
            {predictionLabDataset.taxRatioQuartiles.low.toFixed(4)}.
          </p>
        </article>

        <article className="panel lab-panel">
          <div className="panel-header">
            <div>
              <h3>Risk Runner</h3>
            </div>
          </div>

          <div className="risk-runner-panel">
            <div className="risk-runner-track">
              <div className="risk-runner-zones" aria-hidden="true">
                <span className="risk-zone risk-zone-danger">High risk</span>
                <span className="risk-zone risk-zone-watch">Watch zone</span>
                <span className="risk-zone risk-zone-safe">Low risk</span>
              </div>

              <div
                className={`stick-runner-icon stick-runner-${runnerState}`}
                style={{ left: `${runnerPosition}%` }}
                aria-label={`Runner is in the ${runnerState} lane`}
              >
                <img src="/reader.png" alt="" />
              </div>
            </div>

            <div className="risk-runner-copy">
              <div className="risk-runner-stat risk-runner-stat-ratio">
                <span>Current tax ratio</span>
                <strong>{shipmentSignal.ratio.toFixed(4)}</strong>
              </div>
              <div
                className={`risk-runner-stat risk-runner-stat-lane risk-runner-stat-${runnerState}`}
              >
                <span>Runner lane</span>
                <strong>
                  {runnerState === "alert"
                    ? "High risk"
                    : runnerState === "safe"
                      ? "Low risk"
                      : "Watch lane"}
                </strong>
              </div>
              <p>{runnerMessage}</p>
            </div>
          </div>
        </article>

        <article className="panel lab-panel lab-panel-wide">
          <div className="lab-placeholder-grid">
            {gamePlaceholders.map((game) => (
              <div
                key={game.id}
                className={`lab-placeholder-card ${game.accentClass}`}
              >
                <span className="lab-placeholder-eyebrow">{game.eyebrow}</span>
                <strong>{game.title}</strong>
                <p>{game.detail}</p>
                {renderPlaceholderPreview(game.previewType)}
                <button
                  type="button"
                  className="lab-placeholder-button"
                  onClick={() => {
                    if (game.id === "tax-ratio-slider") {
                      handleOpenTaxRatioLab();
                    } else if (game.id === "risk-puzzle") {
                      handleOpenRiskPuzzle();
                    } else if (game.id === "spot-risky-shipment") {
                      handleOpenShipmentSpot();
                    } else if (game.id === "beat-the-model") {
                      handleOpenBeatModel();
                    }
                  }}
                >
                  {game.cta}
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel lab-panel lab-panel-wide">
          <div className="panel-header">
            <div>
              <h3>Algorithm Results</h3>
              <p>
                Compare the real saved evaluation results for KNN and Logistic
                Regression from this project&apos;s model artifacts.
              </p>
            </div>
          </div>

          <div
            className="lab-scenario-tabs"
            role="tablist"
            aria-label="Algorithm result metrics"
          >
            {algorithmMetrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                className={`lab-scenario-tab ${
                  metric.id === selectedMetricId ? "lab-scenario-tab-active" : ""
                }`}
                onClick={() => setSelectedMetricId(metric.id)}
              >
                {metric.title}
              </button>
            ))}
          </div>

          <div className="lab-confidence-grid">
            <div className="lab-confidence-card">
              <span>KNN result</span>
              <strong>{formatPercent(selectedMetric.knn)}</strong>
              <div className="bar-track">
                <div
                  className="bar-fill low-risk"
                  style={{ width: `${selectedMetric.knn}%` }}
                />
              </div>
            </div>

            <div className="lab-confidence-card">
              <span>Logistic Regression result</span>
              <strong>{formatPercent(selectedMetric.logistic)}</strong>
              <div className="bar-track">
                <div
                  className="bar-fill high-risk"
                  style={{ width: `${selectedMetric.logistic}%` }}
                />
              </div>
            </div>

            <div className="lab-confidence-card">
              <span>KNN test rows</span>
              <strong>
                {formatCompactNumber(predictionLabDataset.model.testRows)}
              </strong>
              <div className="bar-track">
                <div
                  className="bar-fill model-score"
                  style={{
                    width: `${
                      (predictionLabDataset.model.testRows /
                        predictionLabDataset.model.rowsUsed) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="lab-callout">
            <span>Metric insight</span>
            <strong>{selectedMetric.title}</strong>
            <p>{selectedMetric.description}</p>
            <p>{selectedMetric.recommendation}</p>
          </div>
        </article>
      </section>

      {isTaxRatioLabOpen && (
        <div
          className="tax-ratio-lab-backdrop"
          role="presentation"
          onClick={() => setIsTaxRatioLabOpen(false)}
        >
          <div
            className={`tax-ratio-lab-modal ${taxRatioLab.themeClass}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tax-ratio-lab-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsTaxRatioLabOpen(false)}
              aria-label="Close tax ratio lab"
            >
              X
            </button>

            <div className="tax-ratio-lab-header">
              <div>
                <span>Interactive AI Learning Lab</span>
                <h2 id="tax-ratio-lab-title">Tax Ratio Slider</h2>
                <p>
                  Explore how the model reacts as tax_ratio changes. Higher tax
                  ratio pushes the shipment toward safer predictions, while very
                  low tax ratio increases fraud risk.
                </p>
              </div>
              <div className="tax-ratio-lab-status-card">
                <span>Shipment Status</span>
                <strong>{taxRatioLab.status}</strong>
                <small>
                  Based on live tax_ratio movement across the project&apos;s risk
                  bands
                </small>
              </div>
            </div>

            <div className="tax-ratio-lab-layout">
              <section className="tax-ratio-lab-visual-card">
                <div className="tax-ratio-lab-visual-header">
                  <span>Shipment Container</span>
                  <strong>{selectedShipment.productName}</strong>
                </div>

                <div className="tax-ratio-lab-container-shell">
                  <div className="tax-ratio-lab-scan-frame" aria-hidden="true">
                    <i className="tax-ratio-lab-scan-line" />
                    <div className="tax-ratio-lab-container">
                      <span className="tax-ratio-lab-container-code">
                        ML-TR-{selectedShipment.id.toUpperCase().slice(0, 6)}
                      </span>
                      <strong>{selectedShipment.destinationPort}</strong>
                      <small>
                        Invoice {formatCurrency(selectedShipment.priceUsd)}
                      </small>
                      <small>
                        Declared tax{" "}
                        {formatCurrency(selectedShipment.priceUsd * taxRatioLab.ratio)}
                      </small>
                    </div>
                  </div>
                </div>

                <div className="tax-ratio-lab-signal-grid">
                  <div className="tax-ratio-lab-signal-card">
                    <span>Tax Ratio</span>
                    <strong>{taxRatioSliderValue.toFixed(1)}%</strong>
                  </div>
                  <div className="tax-ratio-lab-signal-card">
                    <span>Median Band</span>
                    <strong>{taxRatioLab.medianThreshold.toFixed(1)}%</strong>
                  </div>
                </div>
              </section>

              <section className="tax-ratio-lab-control-card">
                <div className="tax-ratio-lab-slider-header">
                  <span>Tax Ratio (%)</span>
                  <strong>{taxRatioSliderValue.toFixed(1)}%</strong>
                </div>

                <input
                  className="tax-ratio-lab-slider"
                  type="range"
                  min="0"
                  max="20"
                  step="0.1"
                  value={taxRatioSliderValue}
                  onChange={(event) =>
                    setTaxRatioSliderValue(Number(event.target.value))
                  }
                />

                <div className="tax-ratio-lab-slider-scale">
                  <span>0%</span>
                  <span>{taxRatioLab.lowThreshold.toFixed(1)}%</span>
                  <span>{taxRatioLab.highThreshold.toFixed(1)}%</span>
                  <span>20%</span>
                </div>

                <div className="tax-ratio-lab-metrics-grid">
                  <div className="tax-ratio-lab-metric-card">
                    <span>Risk Score</span>
                    <strong>{taxRatioLab.riskScore}/100</strong>
                  </div>
                  <div className="tax-ratio-lab-metric-card">
                    <span>Fraud Probability</span>
                    <strong>{taxRatioLab.fraudProbability}%</strong>
                  </div>
                </div>

                <div className="tax-ratio-lab-meter-card">
                  <div className="tax-ratio-lab-meter-header">
                    <span>Animated Risk Meter</span>
                    <strong>{taxRatioLab.status}</strong>
                  </div>
                  <div className="tax-ratio-lab-meter-track">
                    <div
                      className="tax-ratio-lab-meter-fill"
                      style={{ width: `${taxRatioLab.riskScore}%` }}
                    />
                  </div>
                </div>

                <div className="tax-ratio-lab-ai-card">
                  <span>AI Explanation</span>
                  <strong>
                    Why the model reacts this way at{" "}
                    {taxRatioSliderValue.toFixed(1)}%
                  </strong>
                  <p>{taxRatioLab.explanation}</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {isRiskPuzzleOpen && (
        <div
          className="risk-puzzle-backdrop"
          role="presentation"
          onClick={() => setIsRiskPuzzleOpen(false)}
        >
          <div
            className="risk-puzzle-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="risk-puzzle-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsRiskPuzzleOpen(false)}
              aria-label="Close risk puzzle"
            >
              X
            </button>

            <div className="risk-puzzle-header">
              <div>
                <span>Interactive AI Learning Lab</span>
                <h2 id="risk-puzzle-title">Risk Puzzle</h2>
                <p>
                  Rank shipment features from least risky to most risky based on
                  how strongly they influence shipment fraud prediction in this
                  learning experience.
                </p>
              </div>

              <div className="risk-puzzle-status-card">
                <span>Progress</span>
                <strong>{puzzleFilledCount}/5 placed</strong>
                <small>
                  Build your ranking from weakest influence to strongest
                  influence.
                </small>
              </div>
            </div>

            <div className="risk-puzzle-toolbar">
              <div className="risk-puzzle-difficulty">
                <span>Difficulty</span>
                <div className="risk-puzzle-levels" role="tablist" aria-label="Risk puzzle difficulty">
                  {Object.entries(puzzleDifficulties).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      className={`risk-puzzle-level-button ${
                        puzzleDifficulty === key ? "risk-puzzle-level-button-active" : ""
                      }`}
                      onClick={() => resetRiskPuzzle(key)}
                    >
                      {value.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="risk-puzzle-timer-card">
                <div className="risk-puzzle-timer-copy">
                  <span>Timer</span>
                  <strong>{puzzleTimeLeft}s</strong>
                </div>
                <div className="risk-puzzle-timer-track">
                  <div
                    className="risk-puzzle-timer-fill"
                    style={{
                      width: `${(puzzleTimeLeft / puzzleDifficulties[puzzleDifficulty].time) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="risk-puzzle-actions">
                <button
                  type="button"
                  className="risk-puzzle-ghost-button"
                  onClick={() => setPuzzleShowHint((current) => !current)}
                >
                  AI Hint
                </button>
                <button
                  type="button"
                  className="risk-puzzle-ghost-button"
                  onClick={() => resetRiskPuzzle(puzzleDifficulty)}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="risk-puzzle-submit-button"
                  onClick={() => setPuzzleSubmitted(true)}
                  disabled={puzzleFilledCount < riskPuzzleFeatures.length}
                >
                  Submit
                </button>
              </div>
            </div>

            {puzzleShowHint && (
              <div className="risk-puzzle-hint-card">
                <span>AI Hint</span>
                <strong>{puzzleDifficulties[puzzleDifficulty].label} mode guidance</strong>
                <p>{puzzleDifficulties[puzzleDifficulty].hint}</p>
              </div>
            )}

            <div className="risk-puzzle-layout">
              <section className="risk-puzzle-bank-card">
                <div className="risk-puzzle-section-header">
                  <span>Feature Cards</span>
                  <strong>Drag these into the ranking lane</strong>
                </div>

                <div className="risk-puzzle-bank">
                  {puzzleAvailableOrder.map((featureId) => {
                    const feature = riskPuzzleFeatures.find(
                      (item) => item.id === featureId
                    );
                    if (!feature) {
                      return null;
                    }

                    return (
                      <button
                        key={feature.id}
                        type="button"
                        className="risk-puzzle-feature-card"
                        draggable={!puzzleSubmitted}
                        onDragStart={() => setPuzzleDraggedId(feature.id)}
                        onDragEnd={() => setPuzzleDraggedId(null)}
                        onClick={() => {
                          const firstEmpty = puzzleRanking.findIndex((item) => !item);
                          if (firstEmpty >= 0) {
                            movePuzzleCardToSlot(feature.id, firstEmpty);
                          }
                        }}
                      >
                        <span>{feature.shortLabel}</span>
                        <strong>{feature.label}</strong>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="risk-puzzle-rank-card">
                <div className="risk-puzzle-section-header">
                  <span>Ranking Lane</span>
                  <strong>Least Risky to Most Risky</strong>
                </div>

                <div className="risk-puzzle-rank-axis">
                  <span>Least Risky</span>
                  <span>Most Risky</span>
                </div>

                <div className="risk-puzzle-slots">
                  {puzzleRanking.map((featureId, index) => {
                    const feature = riskPuzzleFeatures.find(
                      (item) => item.id === featureId
                    );

                    return (
                      <div
                        key={`slot-${index + 1}`}
                        className={`risk-puzzle-slot ${
                          featureId ? "risk-puzzle-slot-filled" : ""
                        }`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => movePuzzleCardToSlot(puzzleDraggedId, index)}
                      >
                        <span className="risk-puzzle-slot-index">{index + 1}</span>
                        {feature ? (
                          <button
                            type="button"
                            className="risk-puzzle-ranked-card"
                            draggable={!puzzleSubmitted}
                            onDragStart={() => setPuzzleDraggedId(feature.id)}
                            onDragEnd={() => setPuzzleDraggedId(null)}
                            onDoubleClick={() => removePuzzleCardFromSlot(feature.id)}
                          >
                            <em>{feature.shortLabel}</em>
                            <strong>{feature.label}</strong>
                          </button>
                        ) : (
                          <div className="risk-puzzle-slot-placeholder">
                            Drop feature here
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {puzzleSubmitted && (
              <div className="risk-puzzle-results-card">
                <div className="risk-puzzle-results-header">
                  <div>
                    <span>Score</span>
                    <strong>{puzzleScore}/100</strong>
                  </div>
                  <div>
                    <span>Strongest Risk Factor</span>
                    <strong>{puzzleStrongestFactor?.label}</strong>
                  </div>
                </div>

                <div className="risk-puzzle-correct-order">
                  {puzzleCorrectOrder.map((featureId, index) => {
                    const feature = riskPuzzleFeatures.find(
                      (item) => item.id === featureId
                    );
                    if (!feature) {
                      return null;
                    }

                    return (
                      <div
                        key={feature.id}
                        className={`risk-puzzle-correct-chip ${
                          feature.importance === 5
                            ? "risk-puzzle-correct-chip-strongest"
                            : ""
                        }`}
                      >
                        <span>{index + 1}</span>
                        <strong>{feature.label}</strong>
                      </div>
                    );
                  })}
                </div>

                <div className="risk-puzzle-explanation-panel">
                  <span>AI Explanation</span>
                  <strong>How the model-learning story works</strong>
                  <p>{puzzleExplanation}</p>
                  <p>{puzzleStrongestFactor?.explanation}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isShipmentSpotOpen && (
        <div
          className="shipment-spot-backdrop"
          role="presentation"
          onClick={() => setIsShipmentSpotOpen(false)}
        >
          <div
            className="shipment-spot-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shipment-spot-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsShipmentSpotOpen(false)}
              aria-label="Close Spot the Risky Shipment"
            >
              X
            </button>

            <div className="shipment-spot-header">
              <div>
                <span>AI Customs Intelligence Simulator</span>
                <h2 id="shipment-spot-title">Spot the Risky Shipment</h2>
                <p>
                  Review the shipment details and click the one you think the AI
                  will flag as most suspicious before the system reveals its
                  prediction.
                </p>
              </div>

              <div className="shipment-spot-status-card">
                <span>Live Round</span>
                <strong>{shipmentSpotDifficulty}</strong>
                <small>
                  Pick the shipment with the highest predicted fraud risk.
                </small>
              </div>
            </div>

            <div className="shipment-spot-toolbar">
              <div className="shipment-spot-levels" role="tablist" aria-label="Shipment spot difficulty">
                {Object.entries(shipmentSpotDifficulties).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    className={`shipment-spot-level-button ${
                      shipmentSpotDifficulty === key
                        ? "shipment-spot-level-button-active"
                        : ""
                    }`}
                    onClick={() => startShipmentSpotRound(key)}
                  >
                    {value.label}
                  </button>
                ))}
              </div>

              <div className="shipment-spot-toolbar-stats">
                <div className="shipment-spot-stat-card">
                  <span>Score</span>
                  <strong>{shipmentSpotScore}</strong>
                </div>
                <div className="shipment-spot-stat-card">
                  <span>Streak</span>
                  <strong>x{shipmentSpotStreak}</strong>
                </div>
                <div className="shipment-spot-stat-card">
                  <span>Timer</span>
                  <strong>{shipmentSpotTimeLeft}s</strong>
                </div>
              </div>
            </div>

            <div className="shipment-spot-timer-track">
              <div
                className="shipment-spot-timer-fill"
                style={{
                  width: `${
                    (shipmentSpotTimeLeft /
                      shipmentSpotDifficulties[shipmentSpotDifficulty].time) *
                    100
                  }%`,
                }}
              />
            </div>

            <div className="shipment-spot-grid">
              {shipmentSpotRound.shipments.map((shipment) => {
                const isSelected = shipmentSpotSelection === shipment.id;
                const isAnswer = shipmentSpotRevealed && shipment.id === shipmentSpotRound.answerId;
                const isWrong =
                  shipmentSpotRevealed && isSelected && shipment.id !== shipmentSpotRound.answerId;

                return (
                  <button
                    key={shipment.id}
                    type="button"
                    className={`shipment-spot-card ${
                      isSelected ? "shipment-spot-card-selected" : ""
                    } ${isAnswer ? "shipment-spot-card-answer" : ""} ${
                      isWrong ? "shipment-spot-card-wrong" : ""
                    }`}
                    onClick={() => handleShipmentSpotSubmit(shipment.id)}
                    disabled={shipmentSpotRevealed}
                  >
                    <div className="shipment-spot-card-header">
                      <span>{shipment.productName}</span>
                      <strong>{formatCurrency(shipment.priceUsd)}</strong>
                    </div>

                    <div className="shipment-spot-card-grid">
                      <div>
                        <span>Tax Ratio</span>
                        <strong>{(shipment.taxRatio * 100).toFixed(1)}%</strong>
                      </div>
                      <div>
                        <span>Weight</span>
                        <strong>{shipment.weightKg} kg</strong>
                      </div>
                      <div>
                        <span>Declared Tax</span>
                        <strong>{formatCurrency(shipment.taxUsd)}</strong>
                      </div>
                      <div>
                        <span>Volume</span>
                        <strong>{shipment.volumeM3.toFixed(4)} m³</strong>
                      </div>
                      <div>
                        <span>Destination Port</span>
                        <strong>{shipment.destinationPort}</strong>
                      </div>
                    </div>

                    {shipmentSpotRevealed && (
                      <div className="shipment-spot-reveal">
                        <span>AI Prediction</span>
                        <strong>{shipment.risk}</strong>
                        <small>{shipment.fraudProbability}% fraud probability</small>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {shipmentSpotRevealed && (
              <div className="shipment-spot-explanation-panel">
                <div className="shipment-spot-explanation-header">
                  <div>
                    <span>AI Reveal</span>
                    <strong>
                      {shipmentSpotWasCorrect
                        ? "You identified the risky shipment"
                        : "The AI found a riskier shipment"}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="shipment-spot-next-button"
                    onClick={() => startShipmentSpotRound(shipmentSpotDifficulty)}
                  >
                    Next Round
                  </button>
                </div>

                <p>{shipmentSpotAnswer.explanation}</p>

                <div className="shipment-spot-factor-list">
                  {shipmentSpotAnswer.strongestFactors.map((factor) => (
                    <div key={factor} className="shipment-spot-factor-chip">
                      {factor}
                    </div>
                  ))}
                </div>

                <div className="shipment-spot-importance-list">
                  {Object.entries(shipmentSpotAnswer.importance).map(
                    ([label, value]) => (
                      <div className="shipment-spot-importance-row" key={label}>
                        <div className="shipment-spot-importance-copy">
                          <span>{label}</span>
                          <strong>{value}%</strong>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill high-risk"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isBeatModelOpen && (
        <div
          className="beat-model-backdrop"
          role="presentation"
          onClick={() => setIsBeatModelOpen(false)}
        >
          <div
            className="beat-model-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="beat-model-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsBeatModelOpen(false)}
              aria-label="Close Beat the Model"
            >
              X
            </button>

            <div className="beat-model-header">
              <div>
                <span>AI Customs Training Simulator</span>
                <h2 id="beat-model-title">Beat the Model</h2>
                <p>
                  Predict whether this shipment is HIGH RISK or LOW RISK before
                  the AI scanner finishes. Then compare your answer against the
                  model and the correct outcome.
                </p>
              </div>

              <div className="beat-model-status-card">
                <span>Difficulty</span>
                <strong>{beatModelDifficulty}</strong>
                <small>Try to outscore the AI over multiple rounds.</small>
              </div>
            </div>

            <div className="beat-model-toolbar">
              <div className="beat-model-levels" role="tablist" aria-label="Beat the model difficulty">
                {Object.entries(beatModelDifficulties).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    className={`beat-model-level-button ${
                      beatModelDifficulty === key
                        ? "beat-model-level-button-active"
                        : ""
                    }`}
                    onClick={() => startBeatModelRound(key)}
                  >
                    {value.label}
                  </button>
                ))}
              </div>

              <div className="beat-model-scoreboard">
                <div className="beat-model-score-card">
                  <span>Human</span>
                  <strong>{beatModelHumanScore}</strong>
                </div>
                <div className="beat-model-score-card">
                  <span>AI</span>
                  <strong>{beatModelAiScore}</strong>
                </div>
                <div className="beat-model-score-card">
                  <span>Streak</span>
                  <strong>x{beatModelStreak}</strong>
                </div>
              </div>
            </div>

            <div className="beat-model-layout">
              <section className="beat-model-profile-card">
                <div className="beat-model-section-header">
                  <span>Shipment Profile</span>
                  <strong>Review the shipment before the AI reveals its decision</strong>
                </div>

                <div className={`beat-model-scan-shell ${beatModelScanning ? "beat-model-scan-active" : ""}`}>
                  <i className="beat-model-scan-line" aria-hidden="true" />
                  <div className="beat-model-profile-grid">
                    <div>
                      <span>Invoice Value</span>
                      <strong>{formatCurrency(beatModelRound.priceUsd)}</strong>
                    </div>
                    <div>
                      <span>Tax Ratio</span>
                      <strong>{(beatModelRound.taxRatio * 100).toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span>Shipment Weight</span>
                      <strong>{beatModelRound.weightKg} kg</strong>
                    </div>
                    <div>
                      <span>Declared Tax</span>
                      <strong>{formatCurrency(beatModelRound.taxUsd)}</strong>
                    </div>
                    <div>
                      <span>Volume</span>
                      <strong>{beatModelRound.volumeM3.toFixed(4)} m³</strong>
                    </div>
                    <div>
                      <span>Destination Port</span>
                      <strong>{beatModelRound.destinationPort}</strong>
                    </div>
                  </div>
                </div>
              </section>

              <section className="beat-model-decision-card">
                <div className="beat-model-section-header">
                  <span>Your Prediction</span>
                  <strong>Choose the risk level before the AI scanner completes</strong>
                </div>

                <div className="beat-model-choice-grid">
                  <button
                    type="button"
                    className={`beat-model-choice-button ${
                      beatModelChoice === "HIGH RISK"
                        ? "beat-model-choice-button-active-high"
                        : ""
                    }`}
                    onClick={() => handleBeatModelChoice("HIGH RISK")}
                    disabled={beatModelScanning || beatModelRevealed}
                  >
                    HIGH RISK
                  </button>
                  <button
                    type="button"
                    className={`beat-model-choice-button ${
                      beatModelChoice === "LOW RISK"
                        ? "beat-model-choice-button-active-low"
                        : ""
                    }`}
                    onClick={() => handleBeatModelChoice("LOW RISK")}
                    disabled={beatModelScanning || beatModelRevealed}
                  >
                    LOW RISK
                  </button>
                </div>

                <div className="beat-model-confidence-card">
                  <div className="beat-model-confidence-header">
                    <span>Your Confidence</span>
                    <strong>{beatModelConfidence}%</strong>
                  </div>
                  <input
                    className="beat-model-confidence-slider"
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={beatModelConfidence}
                    onChange={(event) =>
                      setBeatModelConfidence(Number(event.target.value))
                    }
                    disabled={beatModelScanning}
                  />
                </div>

                {beatModelScanning && (
                  <div className="beat-model-loading-card">
                    <span>AI Scanning</span>
                    <strong>Model is evaluating shipment behavior...</strong>
                    <div className="beat-model-loading-bars" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                )}

                {beatModelRevealed && (
                  <div className="beat-model-reveal-card">
                    <div className="beat-model-reveal-grid">
                      <div>
                        <span>Player Prediction</span>
                        <strong>{beatModelChoice}</strong>
                      </div>
                      <div>
                        <span>AI Prediction</span>
                        <strong>{beatModelRound.aiPrediction}</strong>
                      </div>
                      <div>
                        <span>Correct Answer</span>
                        <strong>{beatModelRound.correctAnswer}</strong>
                      </div>
                    </div>

                    <div className="beat-model-result-banner">
                      <span>Round Result</span>
                      <strong>
                        {beatModelHumanCorrect
                          ? "You beat the round"
                          : "The model won this one"}
                      </strong>
                      <small>
                        Fraud probability: {beatModelRound.fraudProbability}%
                      </small>
                    </div>

                    <div className="beat-model-importance-list">
                      {Object.entries(beatModelRound.importance).map(
                        ([label, value]) => (
                          <div className="beat-model-importance-row" key={label}>
                            <div className="beat-model-importance-copy">
                              <span>{label}</span>
                              <strong>{value}%</strong>
                            </div>
                            <div className="bar-track">
                              <div
                                className="bar-fill model-score"
                                style={{ width: `${value}%` }}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className="beat-model-explanation-card">
                      <span>AI Explanation</span>
                      <strong>
                        {beatModelAiCorrect
                          ? "Why the AI made this call"
                          : "Where the AI struggled"}
                      </strong>
                      <p>{beatModelRound.explanation}</p>
                      <div className="beat-model-factor-list">
                        {beatModelRound.strongestFactors.map((factor) => (
                          <div key={factor} className="beat-model-factor-chip">
                            {factor}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="beat-model-next-button"
                      onClick={() => startBeatModelRound(beatModelDifficulty)}
                    >
                      Next Round
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MiniTestingLabPage;
