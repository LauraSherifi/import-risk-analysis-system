from dataclasses import dataclass

import numpy as np


@dataclass
class ThresholdedClassifier:
    pipeline: object
    threshold: float

    def decision_function(self, X):
        return self.pipeline.decision_function(X)

    def predict(self, X):
        scores = self.decision_function(X)
        return np.where(scores >= self.threshold, 1, 0)
