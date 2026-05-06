import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# Section 1: Data Loading
# Load the dataset with error handling
data_path = os.path.join("ml", "data", "processed", "cleaned_dataset.csv")
try:
    df = pd.read_csv(data_path)
except FileNotFoundError:
    print(f"Error: Dataset not found at {data_path}")
    exit(1)

# Section 2: Feature Engineering
# Create the "risk" column based on "tax_ratio"
def assign_risk(tax_ratio):
    return "HIGH RISK" if tax_ratio > 0.5 else "LOW RISK"
df["risk"] = df["tax_ratio"].apply(assign_risk)

# Section 3: Encode Target Variable
# Convert "risk" column to binary values
def process_risk(value):
    return 1 if value == "HIGH RISK" else 0
y = df["risk"].apply(process_risk)

# Prepare features
X = df[["tax", "tax_ratio"]]

# Section 4: Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Section 5: START MODEL - Decision Tree Training
clf = DecisionTreeClassifier(random_state=42)
clf.fit(X_train, y_train)

# Section 6: Evaluation
# Evaluate the model
y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
report = classification_report(y_test, y_pred)

print(f"Accuracy: {accuracy:.2f}")
print("Classification Report:")
print(report)

# Section 7: Save Model
# Ensure the models directory exists
model_dir = os.path.join("ml", "models")
os.makedirs(model_dir, exist_ok=True)

# Save the model
model_path = os.path.join(model_dir, "import_risk_classifier.joblib")
joblib.dump(clf, model_path)
print(f"Model saved to {model_path}")