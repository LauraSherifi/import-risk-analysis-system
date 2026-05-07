import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# Section 1: Data Loading
# Load the dataset with error handling
DATA_PATH = os.path.join("ml", "data", "processed", "cleaned_dataset.csv")
if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(f"Error: Dataset not found at {DATA_PATH}. Please ensure the file exists.")

df = pd.read_csv(DATA_PATH)

# Section 2: Encode Target Variable
# The "risk" column is already processed in the dataset
y = df["risk"].apply(lambda value: 1 if value == "HIGH RISK" else 0)

# Prepare features
X = df[["tax", "tax_ratio"]]

# Section 3: Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Section 4: START MODEL - Decision Tree Training
clf = DecisionTreeClassifier(random_state=42)
clf.fit(X_train, y_train)

# Section 5: Evaluation
# Evaluate the model
y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
report = classification_report(y_test, y_pred)

print(f"Accuracy: {accuracy:.2f}")
print("Classification Report:")
print(report)

# Section 6: Save Model
# Ensure the models directory exists
model_dir = os.path.join("ml", "models")
os.makedirs(model_dir, exist_ok=True)

# Save the model
model_path = os.path.join(model_dir, "import_risk_classifier.joblib")
joblib.dump(clf, model_path)
print(f"Model saved to {model_path}")